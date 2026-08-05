# Panduan Operasional

Dokumen ini menjelaskan cara menjalankan aplikasi, config yang dibutuhkan, dan cara memverifikasi aplikasi berjalan benar.

Aplikasi dijalankan dengan Node di satu mesin, dengan PostgreSQL terpisah.

## Requirement

| Kebutuhan | Versi |
|---|---|
| Node.js | 22 (lihat `.nvmrc`) |
| pnpm | 11.20.0 |
| PostgreSQL | 16 |

## Menjalankan aplikasi

```bash
pnpm install
pnpm prisma generate
pnpm prisma migrate deploy
pnpm build
pnpm start:prod
```

Aplikasi listen di port `3000`, atau sesuai env `PORT`.

## Environment variable

Semua config dibaca dari environment variable. Untuk development lokal, isi file `.env`.

| Variable | Wajib | Default | Keterangan |
|---|---|---|---|
| `DATABASE_URL` | **ya** | tidak ada | Connection string PostgreSQL |
| `JWT_SECRET` | **ya** | tidak ada | Minimal 32 karakter. Generate dengan `openssl rand -base64 32` |
| `JWT_EXPIRES_IN` | tidak | `3600` | Expiry access token, dalam detik |
| `PORT` | tidak | `3000` | Port HTTP |

Aplikasi **fail fast**: kalau variable wajib tidak ada atau tidak valid, aplikasi menolak start dan menyebut variable mana yang bermasalah.

```
ERROR [ExceptionHandler] Invalid environment configuration:
  - JWT_SECRET: is required, minimum 32 characters. Generate with: openssl rand -base64 32
```

Tidak ada default value untuk secret, dan ini disengaja. Default value justru yang paling sering ikut terbawa sampai production tanpa disadari.

> Kalau menambah config baru, baca nilainya lewat `ConfigService`, bukan `process.env` di level module. Module dievaluasi sebelum environment selesai di-load, jadi nilainya akan `undefined` tanpa warning. Contoh yang benar ada di `src/auth/auth.module.ts`.

## Endpoint operasional

| Endpoint | Fungsi |
|---|---|
| `GET /health/live` | Liveness probe. Tidak menyentuh database |
| `GET /health/ready` | Readiness probe, termasuk koneksi database |
| `GET /metrics` | Metrics format Prometheus |
| `GET /openapi` | Swagger UI |

Waktu database mati, `/health/live` tetap `200` sedangkan `/health/ready` jadi `503`. Ini disengaja: database down bukan berarti aplikasinya mati, jadi tidak seharusnya memicu restart. Setelah database hidup lagi, `/health/ready` pulih sendiri tanpa aplikasi perlu di-restart.

### Metrics

| Metric | Tipe | Label |
|---|---|---|
| `http_requests_total` | counter | `method`, `route`, `status` |
| `http_request_duration_seconds` | histogram | `method`, `route`, `status` |

Plus default metrics proses Node: CPU, memory, dan event loop lag. Error rate diturunkan dari `status >= 500` di counter yang sama.

**Label `route` berisi route pattern, bukan URL aslinya.** `/public/genre/action` dan `/public/genre/rpg` sama-sama tercatat sebagai `/public/genre/:slug/?`. Aturan ini wajib dijaga waktu menambah endpoint, karena pakai URL asli akan bikin cardinality metrics naik tanpa batas.

## Shutdown

Aplikasi handle `SIGTERM`: berhenti menerima koneksi baru, menyelesaikan request yang sedang jalan, lalu exit dengan code `143`. Code itu normal untuk proses yang dihentikan lewat signal.

Hasil pengukuran, `SIGTERM` dikirim 50 ms setelah sebuah request mulai: request tetap selesai dengan status `201`, dan proses baru exit 170 sampai 200 ms kemudian.

## Migration

```bash
pnpm prisma migrate deploy
```

File migration ada di `prisma/migrations/`, dimulai dari `0_init` yang membangun seluruh schema di database kosong.

Pakai `pnpm prisma migrate dev --name <nama>` hanya waktu mengubah schema dan perlu bikin file migration baru.

**Jangan menjalankan migration dari dua proses sekaligus.** Prisma tidak mendukungnya.

## Upload file

| Endpoint | Limit | Format |
|---|---|---|
| `POST /game/image` | 1 MB | PNG, JPEG |
| `POST /profile/avatar` | 500 KB | PNG, JPEG |

Hasil upload disimpan di `public/uploads/` dan di-serve sebagai static file.

Tiga hal yang wajib dijaga kalau bagian ini diubah:

1. Limit ukuran dicek sebelum file ditulis. File yang kebesaran ditolak dengan `413` dan tidak pernah sampai ke disk.
2. Format dicek dari isi file, bukan dari `Content-Type` yang dikirim client.
3. Nama file dan ekstensinya ditentukan server. Nama dari client tidak dipakai, karena file `.html` yang lolos ke direktori static akan di-serve sebagai HTML.

## Verifikasi

```bash
pnpm start:prod          # terminal 1
bash scripts/smoke.sh    # terminal 2
```

`scripts/smoke.sh` menjalankan 51 check terhadap aplikasi yang sedang berjalan: health, metrics, auth beserta jalur gagalnya, role guard, CRUD administrator, endpoint public, upload file, bookmark, dan soft delete. Script bikin data sungguhan lalu menghapusnya lagi, dan exit dengan code selain `0` kalau ada yang gagal.

Untuk test ke host lain:

```bash
BASE_URL=http://10.0.0.5:3000 bash scripts/smoke.sh
```

Tiga perilaku di-test manual karena butuh kontrol atas proses aplikasinya. Perintahnya ada di komentar header script:

1. Request tetap selesai waktu aplikasi di-`SIGTERM`.
2. Aplikasi menolak start waktu config tidak lengkap.
3. Perilaku health probe waktu database dimatikan.

## Troubleshooting

| Gejala | Penyebab dan solusi |
|---|---|
| Aplikasi exit waktu start sambil menyebut nama variable | Config tidak lengkap. Isi variable yang disebut. Ini perilaku yang disengaja |
| `/health/ready` `503` tapi `/health/live` tetap `200` | Database tidak terjangkau. Aplikasinya sehat. Cek database dan networking-nya |
| Upload gambar ditolak `400` padahal filenya gambar | Isi file tidak sesuai format PNG atau JPEG. Cek dengan `file <nama-file>`, bukan dari ekstensinya |
| `pnpm test:e2e` gagal di `$connect()` | E2E test me-load seluruh aplikasi, jadi butuh PostgreSQL hidup |
| `node: command not found` waktu menjalankan script | Shell non-interactive tidak load nvm. Jalankan `source ~/.nvm/nvm.sh && nvm use` |
| `ERR_PNPM_UNEXPECTED_STORE` | Jalankan `export XDG_DATA_HOME="$HOME/.local/share"` dulu |
| Semua data hilang setelah menjalankan seeder | `prisma/seed.ts` menghapus isi tabel dulu. Seeder ini me-reset database, bukan menambah data |

