#!/usr/bin/env bash
# Memverifikasi image terhadap syarat S-01 sampai S-08 di
# ../games-catalog/SECURE.md. Dijalankan terhadap image yang sudah di-build:
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

# S-01 — tiap FROM dipin ke digest
total_from=$(grep -c '^FROM ' "$DOCKERFILE")
from_digest=$(grep -cE '^FROM .+@sha256:[0-9a-f]{64}' "$DOCKERFILE")
periksa "S-01 FROM dipin ke digest" "$total_from" "$from_digest"

# S-02 — runtime tanpa toolchain dan tanpa dev dependency
toolchain=$(docker run --rm --entrypoint sh "$IMAGE" -c \
  'command -v gcc make python3 cc g++ 2>/dev/null | wc -l')
periksa "S-02 tidak ada compiler/toolchain" "0" "$toolchain"

devbin=$(docker run --rm --entrypoint sh "$IMAGE" -c \
  'ls node_modules/.bin 2>/dev/null | grep -cE "^(eslint|jest|tsc|nest|prettier)$"')
periksa "S-02 tidak ada dev dependency" "0" "$devbin"

# S-03 — non-root, UID numerik
uid=$(docker run --rm "$IMAGE" id -u)
periksa "S-03 UID bukan root" "1000" "$uid"

user_field=$(docker inspect -f '{{.Config.User}}' "$IMAGE")
periksa "S-03 Config.User numerik" "1000:1000" "$user_field"

# S-04 — file yang tidak boleh ikut ke image
bocor=$(docker run --rm --entrypoint sh "$IMAGE" -c \
  'ls -a /app 2>/dev/null | grep -cE "^\.env|^\.git$|^\.github$|^test$"')
periksa "S-04 tidak ada .env/.git/test di image" "0" "$bocor"

docs=$(docker run --rm --entrypoint sh "$IMAGE" -c \
  'ls /app 2>/dev/null | grep -cE "^(CLAUDE|PLAN|REPRODUCE|OPERATIONS|README)\.md$"')
periksa "S-04 tidak ada dokumen internal" "0" "$docs"

env_saat_kosong=$(docker run --rm --entrypoint sh "$IMAGE" -c 'printenv | grep -c DATABASE_URL')
periksa "S-04 DATABASE_URL tidak ter-bake" "0" "$env_saat_kosong"

# S-05 — tidak ada secret di metadata
rahasia=$(docker history --no-trunc "$IMAGE" 2>/dev/null |
  grep -ciE 'secret=|password=|token=|api[_-]?key=')
periksa "S-05 tidak ada secret di history" "0" "$rahasia"

env_rahasia=$(docker inspect -f '{{json .Config.Env}}' "$IMAGE" |
  grep -ciE 'secret|password|token|api[_-]?key')
periksa "S-05 tidak ada secret di Config.Env" "0" "$env_rahasia"

# S-06 — COPY, bukan ADD
add=$(grep -c '^ADD ' "$DOCKERFILE")
periksa "S-06 tidak memakai ADD" "0" "$add"

# S-07 — tidak ada cache package manager yang tertinggal
cache=$(docker run --rm --entrypoint sh "$IMAGE" -c \
  'ls /var/lib/apt/lists 2>/dev/null | grep -vc "^$"; true' | head -1)
periksa "S-07 apt lists dibersihkan" "0" "${cache:-0}"

# S-08 — pendukung: image punya digest yang bisa dirujuk
# (tag semver diverifikasi di CI, bukan di sini)
layer=$(docker inspect -f '{{len .RootFS.Layers}}' "$IMAGE")
echo "  · jumlah layer: $layer, ukuran: $(docker images "$IMAGE" --format '{{.Size}}')"

echo "───────────────────────────────────────────────────────"
printf 'LULUS: %d   GAGAL: %d\n' "$LULUS" "$GAGAL"
[[ "$GAGAL" -eq 0 ]]
