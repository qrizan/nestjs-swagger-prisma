#!/usr/bin/env bash
#
# Uji fungsional menyeluruh terhadap instance yang sedang berjalan.
#
#   pnpm start:prod          # terminal 1
#   bash scripts/smoke.sh    # terminal 2
#
# Env opsional:
#   BASE_URL      default http://localhost:3000
#   ADMIN_EMAIL   default admin@example.com   (dibuat oleh prisma/seed.ts)
#   ADMIN_PASS    default Password123!
#
# Script ini membuat user, genre, game, dan berkas unggahan sungguhan, lalu
# menghapusnya kembali di akhir. Keluar dengan kode != 0 kalau ada uji gagal,
# jadi aman dipakai sebagai gate di CI.
#
# Yang TIDAK diuji di sini, karena butuh kendali atas siklus hidup proses dan
# bukan sekadar mengirim request — jalankan manual:
#
#   1. Graceful shutdown. Ambil PID dari socket, jangan `pgrep -f` (polanya ikut
#      mencocoki baris perintah Anda sendiri):
#        APPPID=$(ss -ltnp | grep ':3000' | grep -oP 'pid=\K[0-9]+')
#      kirim SIGTERM saat sebuah request sedang berjalan → request tetap selesai,
#      proses baru keluar sesudahnya.
#
#   2. Fail-fast konfigurasi:
#        mv .env .env.off && node dist/main.js ; mv .env.off .env
#      → menolak start, menyebut variabel yang kurang.
#
#   3. Health saat database mati:
#        docker stop <container-postgres>
#      → /health/live tetap 200, /health/ready jadi 503, dan ready pulih sendiri
#        setelah database hidup lagi tanpa aplikasi di-restart.

set -u

BASE="${BASE_URL:-http://localhost:3000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASS="${ADMIN_PASS:-Password123!}"

PASS=0
FAIL=0
FAILED_LIST=()
FIXTURES="$(mktemp -d)"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

green() { printf '\033[32m%s\033[0m' "$1"; }
red() { printf '\033[31m%s\033[0m' "$1"; }

# `bash scripts/smoke.sh` menjalankan shell non-interaktif yang tidak memuat
# ~/.bashrc, jadi nvm tidak aktif dan `node` bisa hilang dari PATH. Muat sendiri
# kalau begitu — tidak berdampak di lingkungan yang tidak memakai nvm (CI,
# container), karena blok ini hanya jalan saat `node` benar-benar tidak ada.
if ! command -v node > /dev/null 2>&1; then
  NVM_SH="${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  if [[ -s "$NVM_SH" ]]; then
    # shellcheck disable=SC1090
    . "$NVM_SH" > /dev/null 2>&1
    nvm use > /dev/null 2>&1 || nvm use "$(cat "$REPO_ROOT/.nvmrc" 2> /dev/null)" > /dev/null 2>&1
  fi
fi

for BIN in node curl; do
  if ! command -v "$BIN" > /dev/null 2>&1; then
    printf '%s %s tidak ada di PATH.\n' "$(red ✗)" "$BIN"
    if [[ "$BIN" == "node" ]]; then
      echo "  Sudah dicoba memuat nvm dari ${NVM_DIR:-$HOME/.nvm}/nvm.sh, tetap gagal."
      echo "  Periksa:  node --version ; command -v node"
    fi
    exit 1
  fi
done
printf '  node %s · %s\n' "$(node --version)" "$(command -v node)"

t() { # t <label> <kode-harapan> <argumen curl...>
  local label="$1" expect="$2"
  shift 2
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' "$@")
  if [[ "$code" == "$expect" ]]; then
    PASS=$((PASS + 1))
    printf '  %s %-52s %s\n' "$(green ✓)" "$label" "$code"
  else
    FAIL=$((FAIL + 1))
    FAILED_LIST+=("$label — dapat $code, harap $expect")
    printf '  %s %-52s %s (harap %s)\n' "$(red ✗)" "$label" "$code" "$expect"
  fi
}

check() { # check <label> <nilai-nyata> <nilai-harapan>
  if [[ "$2" == "$3" ]]; then
    PASS=$((PASS + 1))
    printf '  %s %-52s %s\n' "$(green ✓)" "$1" "$2"
  else
    FAIL=$((FAIL + 1))
    FAILED_LIST+=("$1 — dapat $2, harap $3")
    printf '  %s %-52s %s (harap %s)\n' "$(red ✗)" "$1" "$2" "$3"
  fi
}

j() { node -pe "try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));$1}catch(e){''}"; }

# ── Fixture ────────────────────────────────────────────────────────────────
# PNG 1x1 dan JPEG 1x1 yang benar-benar sah — bukan tanda tangan palsu, karena
# validasi memeriksa isi berkas.
base64 -d > "$FIXTURES/sah.png" <<'EOF'
iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==
EOF
base64 -d > "$FIXTURES/sah.jpg" <<'EOF'
/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==
EOF
printf '<script>alert(document.domain)</script>' > "$FIXTURES/xss.html"
head -c 2000000 /dev/urandom > "$FIXTURES/besar.png"

UPLOAD_IMAGE_DIR="$REPO_ROOT/public/uploads/image"
UPLOAD_AVATAR_DIR="$REPO_ROOT/public/uploads/avatar"
mkdir -p "$UPLOAD_IMAGE_DIR" "$UPLOAD_AVATAR_DIR"
IMAGES_BEFORE="$(ls "$UPLOAD_IMAGE_DIR" 2>/dev/null | sort)"
AVATARS_BEFORE="$(ls "$UPLOAD_AVATAR_DIR" 2>/dev/null | sort)"

# Bersih-bersih dipasang sebagai trap, bukan ditaruh di akhir — kalau script
# berhenti di tengah (login admin gagal, aplikasi mati), data uji yang sudah
# terlanjur dibuat tetap dihapus. Sapuan user memakai awalan `smoke-` supaya
# sisa dari run yang pernah gagal ikut terangkut.
bersih_bersih() {
  local kode=$?
  rm -rf "$FIXTURES"
  [[ -z "${STAMP:-}" ]] && exit $kode

  echo
  echo "── membersihkan data uji ──"
  local baru
  baru=$(comm -13 <(echo "${IMAGES_BEFORE:-}") <(ls "$UPLOAD_IMAGE_DIR" 2>/dev/null | sort))
  baru+=" $(comm -13 <(echo "${AVATARS_BEFORE:-}") <(ls "$UPLOAD_AVATAR_DIR" 2>/dev/null | sort))"
  for f in $baru; do
    rm -f "$UPLOAD_IMAGE_DIR/$f" "$UPLOAD_AVATAR_DIR/$f"
  done
  echo "  berkas unggahan dihapus: $(echo "$baru" | wc -w)"

  node -e '
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
const stamp = process.argv[1];
(async () => {
  const users = await p.user.findMany({
    where: { email: { startsWith: "smoke-" } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  await p.bookmarksOnUsers.deleteMany({ where: { userId: { in: ids } } });
  const game = await p.game.deleteMany({ where: { title: { contains: stamp } } });
  const genre = await p.genre.deleteMany({ where: { name: { contains: stamp } } });
  const user = await p.user.deleteMany({ where: { id: { in: ids } } });
  console.log(`  baris DB dihapus — user: ${user.count}, game: ${game.count}, genre: ${genre.count}`);
  await p.$disconnect();
})();
' "$STAMP" 2> /dev/null || echo "  (bersih-bersih DB dilewati: @prisma/client tidak bisa dimuat)"

  exit $kode
}
trap bersih_bersih EXIT

STAMP="$(date +%s%N)"
UEMAIL="smoke-$STAMP@example.com"
# Nama genre sengaja sudah berbentuk slug: `GET /genre` tidak mengembalikan
# field `slug`, dan `slugify(name, {lower:true})` atas nama ini menghasilkan
# dirinya sendiri — jadi slug-nya diketahui tanpa perlu ditebak atau di-query.
GNAME="zz-smoke-genre-$STAMP"
GSLUG="$GNAME"
GAME_TITLE="ZZ Smoke Game $STAMP"

if ! curl -sf -o /dev/null "$BASE/health/live"; then
  echo "$(red '✗') Aplikasi tidak merespons di $BASE — jalankan 'pnpm start:prod' dulu."
  exit 1
fi

echo "═══ 1. OPS ═══"
t "GET /health/live" 200 "$BASE/health/live"
t "GET /health/ready" 200 "$BASE/health/ready"
t "GET /metrics" 200 "$BASE/metrics"
t "GET /openapi (Swagger UI)" 200 "$BASE/openapi"
t "GET /openapi-json" 200 "$BASE/openapi-json"
t "GET / (root)" 200 "$BASE/"
t "GET /uploads/avatar/default.png (statis)" 200 "$BASE/uploads/avatar/default.png"

echo "═══ 2. AUTH ═══"
t "POST /auth/register" 201 -X POST "$BASE/auth/register" -H 'Content-Type: application/json' \
  -d "{\"username\":\"smokeuser\",\"email\":\"$UEMAIL\",\"password\":\"Str0ng!Passw0rd\"}"
t "POST /auth/register (email duplikat)" 302 -X POST "$BASE/auth/register" -H 'Content-Type: application/json' \
  -d "{\"username\":\"smokeuser\",\"email\":\"$UEMAIL\",\"password\":\"Str0ng!Passw0rd\"}"
t "POST /auth/register (password lemah)" 400 -X POST "$BASE/auth/register" -H 'Content-Type: application/json' \
  -d "{\"username\":\"x\",\"email\":\"smoke-weak-$STAMP@example.com\",\"password\":\"lemah\"}"
t "POST /auth/login (password salah)" 401 -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$UEMAIL\",\"password\":\"SalahSalah123!\"}"
t "POST /auth/login (email tak dikenal)" 404 -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"tidak-ada@example.com","password":"Str0ng!Passw0rd"}'
t "POST /auth/login (benar)" 201 -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$UEMAIL\",\"password\":\"Str0ng!Passw0rd\"}"

UT=$(curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$UEMAIL\",\"password\":\"Str0ng!Passw0rd\"}" | j 'd.accessToken')
AT=$(curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}" | j 'd.accessToken')

if [[ -z "$AT" ]]; then
  echo "  $(red '✗') Gagal login sebagai admin ($ADMIN_EMAIL). Sudah jalankan 'npx prisma db seed'?"
  exit 1
fi

echo "═══ 3. GUARD & OTORISASI ═══"
t "GET /profile tanpa token" 401 "$BASE/profile"
t "GET /profile token palsu" 401 "$BASE/profile" -H "Authorization: Bearer palsu.palsu.palsu"
t "GET /profile token USER" 200 "$BASE/profile" -H "Authorization: Bearer $UT"
t "GET /game (admin-only) token USER" 403 "$BASE/game" -H "Authorization: Bearer $UT"
t "GET /game token ADMIN" 200 "$BASE/game" -H "Authorization: Bearer $AT"
t "GET /user (admin-only) token USER" 403 "$BASE/user" -H "Authorization: Bearer $UT"
t "GET /user token ADMIN" 200 "$BASE/user" -H "Authorization: Bearer $AT"
t "GET /dashboard token ADMIN" 200 "$BASE/dashboard" -H "Authorization: Bearer $AT"

echo "═══ 4. CRUD ADMIN ═══"
t "POST /genre" 201 -X POST "$BASE/genre" -H "Authorization: Bearer $AT" \
  -H 'Content-Type: application/json' -d "{\"name\":\"$GNAME\"}"
GID=$(curl -s "$BASE/genre" -H "Authorization: Bearer $AT" | j "(d.data.find(g=>g.name==='$GNAME')||{}).id")
t "GET /genre (daftar)" 200 "$BASE/genre" -H "Authorization: Bearer $AT"
check "genre baru ditemukan di daftar" "$([[ -n "$GID" ]] && echo ada || echo kosong)" "ada"

t "POST /game" 201 -X POST "$BASE/game" -H "Authorization: Bearer $AT" \
  -H 'Content-Type: application/json' \
  -d "{\"title\":\"$GAME_TITLE\",\"content\":\"isi uji\",\"imageUrl\":\"/uploads/image/x.png\",\"genreId\":\"$GID\"}"
GAMEID=$(curl -s "$BASE/game?limit=200" -H "Authorization: Bearer $AT" | j "(d.data.find(g=>g.title==='$GAME_TITLE')||{}).id")
t "GET /game/:id" 200 "$BASE/game/$GAMEID" -H "Authorization: Bearer $AT"
t "PATCH /game/:id" 200 -X PATCH "$BASE/game/$GAMEID" -H "Authorization: Bearer $AT" \
  -H 'Content-Type: application/json' -d "{\"title\":\"$GAME_TITLE diubah\",\"content\":\"isi baru\"}"
t "GET /game?page=1&limit=5 (paginasi offset)" 200 "$BASE/game?page=1&limit=5" -H "Authorization: Bearer $AT"

echo "═══ 5. PUBLIC (tanpa auth) ═══"
t "GET /public/games" 200 "$BASE/public/games"
t "GET /public/games?keyword=…" 200 "$BASE/public/games?keyword=a"
t "GET /public/games?cursor=undefined (klien lama)" 200 "$BASE/public/games?cursor=undefined"
t "GET /public/games?cursor=ngawur [F-10]" 400 "$BASE/public/games?cursor=ngawur"
t "GET /public/game/:slug tak dikenal" 404 "$BASE/public/game/tidak-ada-slug-ini"
t "GET /public/genre/:slug tak dikenal [F-10]" 404 "$BASE/public/genre/tidak-ada-slug-ini"
t "GET /public/genre/:slug (ada)" 200 "$BASE/public/genre/$GSLUG"
t "GET /public/genre/:slug?cursor=ngawur [F-10]" 400 "$BASE/public/genre/$GSLUG?cursor=ngawur"
t "GET /public/genre/:slug halaman kosong [F-10]" 200 "$BASE/public/genre/$GSLUG?cursor=2000-01-01T00:00:00.000Z"

echo "═══ 6. UNGGAH BERKAS ═══"
t "POST /game/image (PNG sah) [F-14]" 201 -X POST "$BASE/game/image" \
  -H "Authorization: Bearer $AT" -F "image=@$FIXTURES/sah.png"
t "POST /profile/avatar (JPEG sah) [F-14]" 201 -X POST "$BASE/profile/avatar" \
  -H "Authorization: Bearer $UT" -F "avatar=@$FIXTURES/sah.jpg"
t "POST /game/image tanpa berkas [F-10]" 400 -X POST "$BASE/game/image" \
  -H "Authorization: Bearer $AT" -F "dummy=1"
t "POST /game/image HTML menyamar png [F-15]" 400 -X POST "$BASE/game/image" \
  -H "Authorization: Bearer $AT" -F "image=@$FIXTURES/xss.html;type=image/png"
t "POST /profile/avatar 2MB (batas 500KB)" 413 -X POST "$BASE/profile/avatar" \
  -H "Authorization: Bearer $UT" -F "avatar=@$FIXTURES/besar.png"

# Inti F-15: berkas yang ditolak tidak boleh mendarat di disk sama sekali.
HTML_TERTULIS=$(find "$UPLOAD_IMAGE_DIR" "$UPLOAD_AVATAR_DIR" -maxdepth 1 -name '*.html' 2>/dev/null | wc -l)
check "tidak ada berkas .html di direktori upload [F-15]" "$HTML_TERTULIS" "0"

echo "═══ 7. BOOKMARK & PROFIL ═══"
t "GET /bookmark/:game_id (tambah)" 200 "$BASE/bookmark/$GAMEID" -H "Authorization: Bearer $UT"
t "GET /profile (bookmark tampil)" 200 "$BASE/profile" -H "Authorization: Bearer $UT"
t "GET /bookmark/:game_id (toggle lagi)" 200 "$BASE/bookmark/$GAMEID" -H "Authorization: Bearer $UT"
t "PATCH /profile/update" 200 -X PATCH "$BASE/profile/update" -H "Authorization: Bearer $UT" \
  -H 'Content-Type: application/json' -d "{\"username\":\"smokebaru\",\"email\":\"$UEMAIL\"}"

echo "═══ 8. SOFT DELETE ═══"
t "DELETE /game/:id" 200 -X DELETE "$BASE/game/$GAMEID" -H "Authorization: Bearer $AT"
HIT=$(curl -s "$BASE/public/games?keyword=ZZ%20Smoke%20Game%20$STAMP" | j 'd.data.length')
check "game terhapus hilang dari /public/games" "${HIT:-?}" "0"
HIT_GENRE=$(curl -s "$BASE/public/genre/$GSLUG" | j 'd.data[0].game.length')
check "game terhapus hilang dari per-genre [F-16]" "${HIT_GENRE:-?}" "0"

echo "═══ 9. KARDINALITAS METRIK ═══"
# Label route wajib berupa POLA rute. Kalau ada URL mentah, satu slug = satu
# time series baru dan Prometheus meledak.
MENTAH=$(curl -s "$BASE/metrics" | grep -oP 'route="\K[^"]*' | sort -u | grep -c "$STAMP")
check "tidak ada URL mentah di label route" "$MENTAH" "0"

echo
echo "───────────────────────────────────────────────────────"
printf 'LULUS: %s   GAGAL: %s\n' "$PASS" "$FAIL"
for f in "${FAILED_LIST[@]:-}"; do [[ -n "$f" ]] && echo "  gagal → $f"; done
[[ "$FAIL" -eq 0 ]] || exit 1
