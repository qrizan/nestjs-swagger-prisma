# syntax=docker/dockerfile:1
#
# Base image dipin ke digest agar build reproducible.
# Digest ini menunjuk node:22-bookworm-slim berisi Node v22.23.2, sesuai .nvmrc.

FROM node:22-bookworm-slim@sha256:d649c27dae7ba0137b3cef5dd75baa422c08dc3d9e3fc0c23dfb172dc3cc6436 AS builder

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /app
RUN corepack enable

# Prisma memilih query engine dari versi libssl yang terdeteksi saat generate.
# Tanpa paket openssl deteksinya jatuh ke debian-openssl-1.1.x, sedangkan
# runtime memakai 3.0.x, dan aplikasi gagal saat bootstrap.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

# schema.prisma disalin sebelum install karena postinstall @prisma/client
# menjalankan `prisma generate` dan membacanya dari sana.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma

# Cache mount menahan store pnpm dan unduhan corepack antar build.
RUN --mount=type=cache,target=/root/.cache/node/corepack \
    --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN pnpm build

# Dev dependency dibuang dari node_modules yang sudah ada, lalu client Prisma
# di-generate ulang agar tersedia di pohon yang sudah dipangkas.
RUN pnpm prune --prod && pnpm prisma generate


FROM node:22-bookworm-slim@sha256:d649c27dae7ba0137b3cef5dd75baa422c08dc3d9e3fc0c23dfb172dc3cc6436 AS runtime

# Query engine Prisma tertaut ke libssl, yang tidak ada di bookworm-slim.
# Tanpa ini aplikasi tetap start dan baru gagal pada query pertama.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

# npm, npx, dan corepack terbawa base image tapi tidak dipakai saat runtime:
# aplikasi dijalankan dengan `node dist/main` dan CLI Prisma dipanggil langsung
# lewat node_modules/.bin/prisma.
RUN rm -rf /usr/local/lib/node_modules/npm \
           /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm \
           /usr/local/bin/npx \
           /usr/local/bin/corepack

ENV NODE_ENV=production
WORKDIR /app

# Hanya hasil build yang disalin; toolchain dan dev dependency tidak ikut.
# CLI Prisma tersedia sebagai dependency produksi, sehingga migrasi dapat
# dijalankan dari image ini:
#   docker run --rm <image> node_modules/.bin/prisma migrate deploy
COPY --from=builder --chown=1000:1000 /app/node_modules ./node_modules
COPY --from=builder --chown=1000:1000 /app/dist ./dist
COPY --from=builder --chown=1000:1000 /app/prisma ./prisma
COPY --from=builder --chown=1000:1000 /app/package.json ./package.json

# Upload menulis ke public/uploads saat runtime, termasuk membuat direktorinya.
COPY --chown=1000:1000 public ./public

# UID numerik agar `runAsNonRoot` di Kubernetes dapat memverifikasinya.
USER 1000:1000

EXPOSE 3000

# Memakai http bawaan Node agar tidak perlu menambahkan curl atau wget.
# Memeriksa liveness, bukan readiness: database yang mati tidak berarti
# container-nya rusak.
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "require('http').get({host:'127.0.0.1',port:process.env.PORT||3000,path:'/health/live'},r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/main"]
