# Games Catalog API

REST API untuk aplikasi katalog game. Dibangun dengan NestJS dan Prisma, didokumentasikan lewat Swagger.

Config runtime, health probe, metrics, migration, dan cara verifikasi ada di **[OPERATIONS.md](OPERATIONS.md)**.

## Stack

| Teknologi | Referensi |
| :--- | :--- |
| NestJS | https://nestjs.com |
| Prisma ORM | https://www.prisma.io |
| PostgreSQL | https://www.postgresql.org |
| Swagger | https://swagger.io |
| Compodoc | https://compodoc.app |

Node **22** dan pnpm **11.20.0**, di-pin lewat `.nvmrc` dan `package.json`.

## Role pengguna

![administrator](screenshots/administrator.png)
![user](screenshots/user.png)
![public](screenshots/public.png)

## Client

| Aplikasi | Repo |
| :--- | :--- |
| Dashboard administrator | https://github.com/qrizan/react-shadcn-redux |
| Katalog publik | https://github.com/qrizan/nextjs-chakra-reactquery |

## Setup

### 1. Dependency

```bash
pnpm install
```

### 2. Environment variable

```bash
cp .env.example .env
```

Isi minimal dua variable ini di `.env`:

```
DATABASE_URL="postgresql://johndoe:randompassword@localhost:5432/mydb?schema=public"
JWT_SECRET="<hasil generate di bawah>"
```

Generate `JWT_SECRET`:

```bash
openssl rand -base64 32
```

`JWT_SECRET` **wajib diisi, minimal 32 karakter**. Aplikasi menolak start kalau kosong atau terlalu pendek, dan tidak ada default value. Daftar lengkap variable ada di [OPERATIONS.md](OPERATIONS.md#environment-variable).

### 3. Database

```bash
pnpm prisma generate
pnpm prisma migrate deploy
```

`migrate deploy` menerapkan file migration yang sudah ada di repo. Pakai `pnpm prisma migrate dev --name <nama>` hanya kalau sedang mengubah schema dan perlu bikin file migration baru.

### 4. Seed data (opsional)

```bash
npx prisma db seed
```

Data contoh ada di `prisma/seed.ts`. Perlu diperhatikan: seeder ini **menghapus isi tabel dulu**, jadi ia me-reset database, bukan menambah data.

### 5. Run

```bash
pnpm start:dev                      # development, dengan watch
pnpm build && pnpm start:prod       # production
```

Aplikasi jalan di http://localhost:3000

## Testing

```bash
pnpm test                   # unit test
pnpm test:e2e               # e2e test, butuh PostgreSQL hidup
pnpm lint
```

Test fungsional menyeluruh terhadap aplikasi yang sedang jalan:

```bash
pnpm start:prod             # terminal 1
bash scripts/smoke.sh       # terminal 2
```

Penjelasannya ada di [OPERATIONS.md](OPERATIONS.md#verifikasi).

## Dokumentasi API

Swagger UI: http://localhost:3000/openapi

![api-documentation](screenshots/api-documentation.png)

## Tools

### Prisma Studio

```bash
npx prisma studio
```

Database browser di http://localhost:5555

![prisma-studio](screenshots/prisma-studio.png)

### Dokumentasi kode

```bash
npx @compodoc/compodoc -p tsconfig.json -s
```

Tersedia di http://127.0.0.1:8080

![code-documentation](screenshots/code-documentation.png)
