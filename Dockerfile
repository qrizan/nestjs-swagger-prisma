# syntax=docker/dockerfile:1
#
# Base image dipin ke digest, bukan tag.
# Tag bisa dipindahkan penerbitnya,
# dan build yang tidak reproducible membuat hasil scan sebelumnya tidak berlaku untuk saat ini.
# Digest ini menunjuk node:22-bookworm-slim yang berisi Node v22.23.2, cocok dengan .nvmrc.

FROM node:22-bookworm-slim@sha256:d649c27dae7ba0137b3cef5dd75baa422c08dc3d9e3fc0c23dfb172dc3cc6436 AS builder

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /app
RUN corepack enable

# schema.prisma disalin sebelum install karena postinstall @prisma/client
# menjalankan `prisma generate` dan membacanya dari sana.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma

# Cache mount dipakai supaya store pnpm dan unduhan corepack tidak diambil ulang
# tiap build. Pemeriksaan supply-chain policy pnpm menyentuh jaringan untuk 989
# entri dan itu bagian paling mahal dari build ini.
RUN --mount=type=cache,target=/root/.cache/node/corepack \
    --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN pnpm build

# Dev dependency dibuang dari node_modules yang sudah ada, bukan lewat install
# kedua di stage runtime. Install dua kali berarti membayar seluruh biaya
# jaringan dua kali, dan yang kedua pernah gagal karena timeout.
# `prisma generate` diulang setelah prune supaya client dipastikan ada di pohon
# yang sudah dipangkas.
RUN pnpm prune --prod && pnpm prisma generate


FROM node:22-bookworm-slim@sha256:d649c27dae7ba0137b3cef5dd75baa422c08dc3d9e3fc0c23dfb172dc3cc6436 AS runtime

# Query engine Prisma tertaut ke libssl, dan bookworm-slim tidak membawanya sama sekali.
# Tanpa ini aplikasi gagal pada query pertama, bukan saat start,
# sehingga gejalanya muncul jauh dari penyebabnya.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app

# Tidak ada pnpm maupun corepack di stage ini.
# Yang disalin hanya hasil akhirnya, jadi toolchain dan dev dependency tidak ikut memperluas surface attack.
# CLI prisma tetap ada sebagai dependency produksi supaya `migrate deploy` bisa
# dijalankan dari image yang identik dengan yang dideploy:
#   docker run --rm games-api node_modules/.bin/prisma migrate deploy
COPY --from=builder --chown=1000:1000 /app/node_modules ./node_modules
COPY --from=builder --chown=1000:1000 /app/dist ./dist
COPY --from=builder --chown=1000:1000 /app/prisma ./prisma
COPY --from=builder --chown=1000:1000 /app/package.json ./package.json

# saveImage() memanggil mkdir saat runtime.
# Tanpa chown, mkdir gagal di bawah user non-root dan upload balas 500.
COPY --chown=1000:1000 public ./public

# UID numerik, bukan nama: Kubernetes runAsNonRoot memeriksa angka dan tidak bisa meresolusi nama user dari dalam image.
USER 1000:1000

EXPOSE 3000

# Memakai http bawaan Node supaya tidak perlu menambahkan curl atau wget ke dalam image.
# Liveness sengaja dipakai di sini, bukan readiness: database yang mati bukan alasan untuk menyatakan container-nya rusak.
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "require('http').get({host:'127.0.0.1',port:process.env.PORT||3000,path:'/health/live'},r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/main"]
