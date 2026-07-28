# Task 00: Setup Monorepo & Infrastruktur Dasar

## Status
- [ ] Belum dikerjakan

## Tipe
Infrastruktur

## Konteks
Fondasi teknis proyek harus disiapkan sebelum fitur apapun dikembangkan, mengikuti stack dan struktur yang telah ditentukan.

## Dokumen Referensi
- docs/02-tech-stack.md
- docs/07-folder-structure.md
- docs/09-project-conventions.md

## Dependency
Tidak ada — task pertama.

## Scope Pekerjaan
1. Inisialisasi monorepo dengan Turborepo + pnpm workspaces sesuai struktur di `07-folder-structure.md` §7.1.
2. Setup `apps/api` (NestJS), `apps/storefront` (Next.js), `apps/admin` (Next.js) sebagai skeleton kosong yang bisa `pnpm dev` tanpa error.
3. Setup `packages/database` dengan Prisma terkoneksi ke PostgreSQL (via Docker Compose).
4. Setup `packages/types`, `packages/ui`, `packages/config`, `packages/utils` sebagai package kosong dengan `package.json` dan `tsconfig.json` dasar.
5. Setup Docker Compose (`docker/docker-compose.dev.yml`) untuk PostgreSQL + Redis + MinIO (S3-compatible lokal) untuk development.
6. Setup ESLint + Prettier + shared config di `packages/config`, diterapkan ke semua app/package.
7. Setup Husky + lint-staged + Commitlint sesuai `09-project-conventions.md` §9.2.
8. Setup GitHub Actions dasar: job lint, type-check, build untuk setiap PR ke `main`.
9. Buat `.env.example` lengkap sesuai `09-project-conventions.md` §9.5.
10. Buat `README.md` root dengan instruksi setup development (clone → install → docker up → migrate → seed → dev).

## Kriteria Selesai (Acceptance Criteria)
- [ ] `pnpm install` berhasil tanpa error di root monorepo.
- [ ] `docker compose -f docker/docker-compose.dev.yml up` menjalankan PostgreSQL, Redis, MinIO dengan sukses.
- [ ] `pnpm --filter api dev` menjalankan NestJS di port yang ditentukan tanpa error, endpoint `/health` merespons 200.
- [ ] `pnpm --filter storefront dev` dan `pnpm --filter admin dev` menjalankan Next.js tanpa error.
- [ ] `pnpm lint` dan `pnpm type-check` berjalan di seluruh monorepo tanpa error.
- [ ] Commit dengan pesan tidak sesuai Conventional Commits ditolak oleh git hook.
- [ ] CI GitHub Actions hijau pada PR percobaan.

## Di Luar Scope
- Implementasi skema Prisma penuh (lihat Task 01).
- Deployment ke environment production (task infrastruktur terpisah di kemudian hari).
