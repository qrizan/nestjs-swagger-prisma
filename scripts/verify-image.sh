#!/usr/bin/env bash
# Memeriksa image hasil build terhadap sejumlah syarat dasar: base image dipin,
# runtime tanpa toolchain, proses non-root, tidak ada konfigurasi atau secret
# yang ikut terbawa.
#
#   docker build -t games-api:dev .
#   bash scripts/verify-image.sh games-api:dev
#
# Exit code selain 0 kalau ada syarat yang tidak terpenuhi.

set -uo pipefail

IMAGE="${1:-games-api:dev}"
DOCKERFILE="${DOCKERFILE:-Dockerfile}"

HIJAU=$'\e[32m'; MERAH=$'\e[31m'; NORMAL=$'\e[0m'
LULUS=0; GAGAL=0

periksa() {
  local nama="$1" harapan="$2" hasil="$3"
  if [[ "$hasil" == "$harapan" ]]; then
    printf '  %s✓%s %-52s %s\n' "$HIJAU" "$NORMAL" "$nama" "$hasil"
    LULUS=$((LULUS + 1))
  else
    printf '  %s✗%s %-52s %s (harusnya: %s)\n' "$MERAH" "$NORMAL" "$nama" "$hasil" "$harapan"
    GAGAL=$((GAGAL + 1))
  fi
}

echo "Image: $IMAGE"
echo "───────────────────────────────────────────────────────"

# Base image
total_from=$(grep -c '^FROM ' "$DOCKERFILE")
from_digest=$(grep -cE '^FROM .+@sha256:[0-9a-f]{64}' "$DOCKERFILE")
periksa "tiap FROM dipin ke digest" "$total_from" "$from_digest"

add=$(grep -c '^ADD ' "$DOCKERFILE")
periksa "tidak memakai ADD" "0" "$add"

# Isi stage runtime
toolchain=$(docker run --rm --entrypoint sh "$IMAGE" -c \
  'command -v gcc make python3 cc g++ 2>/dev/null | wc -l')
periksa "tidak ada compiler/toolchain" "0" "$toolchain"

pkgmgr=$(docker run --rm --entrypoint sh "$IMAGE" -c \
  'command -v npm npx corepack pnpm 2>/dev/null | wc -l')
periksa "tidak ada package manager" "0" "$pkgmgr"

devbin=$(docker run --rm --entrypoint sh "$IMAGE" -c \
  'ls node_modules/.bin 2>/dev/null | grep -cE "^(eslint|jest|tsc|nest|prettier)$"')
periksa "tidak ada dev dependency" "0" "$devbin"

cache=$(docker run --rm --entrypoint sh "$IMAGE" -c \
  'ls /var/lib/apt/lists 2>/dev/null | grep -vc "^$"; true' | head -1)
periksa "cache apt dibersihkan" "0" "${cache:-0}"

# Identitas proses
uid=$(docker run --rm "$IMAGE" id -u)
periksa "UID bukan root" "1000" "$uid"

user_field=$(docker inspect -f '{{.Config.User}}' "$IMAGE")
periksa "Config.User memakai UID numerik" "1000:1000" "$user_field"

# Yang tidak boleh ikut ke image
bocor=$(docker run --rm --entrypoint sh "$IMAGE" -c \
  'ls -a /app 2>/dev/null | grep -cE "^\.env|^\.git$|^\.github$|^test$"')
periksa "tidak ada .env/.git/test" "0" "$bocor"

markdown=$(docker run --rm --entrypoint sh "$IMAGE" -c \
  'ls /app 2>/dev/null | grep -c "\.md$"')
periksa "tidak ada berkas markdown" "0" "$markdown"

env_kosong=$(docker run --rm --entrypoint sh "$IMAGE" -c 'printenv | grep -c DATABASE_URL')
periksa "DATABASE_URL tidak ter-bake" "0" "$env_kosong"

rahasia=$(docker history --no-trunc "$IMAGE" 2>/dev/null |
  grep -ciE 'secret=|password=|token=|api[_-]?key=')
periksa "tidak ada secret di image history" "0" "$rahasia"

env_rahasia=$(docker inspect -f '{{json .Config.Env}}' "$IMAGE" |
  grep -ciE 'secret|password|token|api[_-]?key')
periksa "tidak ada secret di Config.Env" "0" "$env_rahasia"

layer=$(docker inspect -f '{{len .RootFS.Layers}}' "$IMAGE")
echo "  · $layer layer, ukuran $(docker images "$IMAGE" --format '{{.Size}}')"

echo "───────────────────────────────────────────────────────"
printf 'LULUS: %d   GAGAL: %d\n' "$LULUS" "$GAGAL"
[[ "$GAGAL" -eq 0 ]]
