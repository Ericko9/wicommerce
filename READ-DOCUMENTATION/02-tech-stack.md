# 02. Tech Stack

## 2.1 Ringkasan Arsitektur

```
┌───────────────────────┐   ┌───────────────────────┐
│  Storefront (Next.js)  │   │  Admin Panel (Next.js) │
│  customer-facing app   │   │  tenant & super admin  │
└───────────┬───────────┘   └───────────┬───────────┘
            │        REST API (JSON)     │
            └─────────────┬──────────────┘
                           │
                 ┌─────────▼──────────┐
                 │   NestJS API (BFF)  │
                 │  modular monolith   │
                 └─────────┬──────────┘
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼───────┐ ┌────────▼───────┐ ┌────────▼────────┐
│  PostgreSQL    │ │     Redis      │ │  Object Storage  │
│  (via Prisma)  │ │ cache/queue/   │ │  (S3-compatible/ │
│                │ │ session        │ │   MinIO)         │
└────────────────┘ └────────────────┘ └──────────────────┘
```

## 2.2 Backend

| Komponen | Teknologi | Versi Minimum | Keterangan |
|---|---|---|---|
| Runtime | Node.js | 20 LTS | |
| Bahasa | TypeScript | 5.x | strict mode wajib aktif |
| Framework | NestJS | 10.x | modular monolith, DI-based |
| ORM | Prisma | 5.x | migration + type-safe client |
| Database | PostgreSQL | 15+ | shared schema multi-tenant |
| Cache/Queue/Session | Redis | 7.x | via ioredis |
| Job Queue | BullMQ | latest | berjalan di atas Redis |
| Validasi | class-validator + class-transformer | | DTO validation di NestJS |
| Auth | Passport.js + JWT | | access token + refresh token |
| API Docs | Swagger (OpenAPI) via `@nestjs/swagger` | | auto-generate dari DTO/decorator |
| Testing | Jest + Supertest | | unit + e2e |
| File Storage | S3-compatible (AWS S3 / MinIO self-hosted) | | untuk gambar produk, invoice, dsb. |

## 2.3 Frontend

| Komponen | Teknologi | Versi Minimum | Keterangan |
|---|---|---|---|
| Framework | Next.js | 14+ (App Router) | 2 aplikasi terpisah: storefront & admin |
| Bahasa | TypeScript | 5.x | strict mode |
| UI Library | React | 18+ | |
| Styling | Tailwind CSS | 3.x | + shadcn/ui untuk admin panel |
| State Management | Zustand (client state) + TanStack Query (server state) | | lihat `13-state-management.md` |
| Form | React Hook Form + Zod | | validasi client selaras dengan DTO backend |
| Data Fetching | TanStack Query + REST client (axios/fetch wrapper) | | |
| Testing | Vitest / React Testing Library, Playwright (e2e) | | |

## 2.4 Infrastruktur & DevOps

| Komponen | Teknologi | Keterangan |
|---|---|---|
| Containerization | Docker + Docker Compose | dev environment seragam |
| Orkestrasi Produksi | Docker Compose (awal) → Kubernetes (opsional saat scale besar) | mulai sederhana |
| CI/CD | GitHub Actions | lint, test, build, deploy |
| Reverse Proxy | Nginx / Traefik | routing subdomain per tenant |
| Monitoring | Prometheus + Grafana (opsional fase lanjut) | |
| Logging | Pino (structured logging) → dikirim ke Loki/ELK (opsional) | |
| Error Tracking | Sentry | frontend & backend |

## 2.5 Monorepo Tooling

| Komponen | Teknologi | Keterangan |
|---|---|---|
| Monorepo Manager | Turborepo | build caching, task orchestration |
| Package Manager | pnpm | workspace-based |
| Linting | ESLint (shared config) | |
| Formatting | Prettier | |
| Git Hooks | Husky + lint-staged | commit hooks |
| Commit Convention | Conventional Commits + Commitlint | lihat `09-project-conventions.md` |

## 2.6 Integrasi Pihak Ketiga (Opsional, per Feature Flag)

| Kategori | Provider | Catatan |
|---|---|---|
| Payment Gateway | Midtrans, Xendit | modul terpisah, diaktifkan per tenant |
| Ongkir | RajaOngkir / Biteship / Komerce | modul terpisah |
| Notifikasi | WhatsApp Business API (mis. via Fonnte/Woowa), Email (Resend/SMTP) | |
| SMS OTP | Twilio / Zenziva | opsional untuk verifikasi |

## 2.7 Justifikasi Pemilihan Stack

- **NestJS** dipilih karena struktur modular bawaannya (Module, Controller, Provider) selaras langsung dengan kebutuhan *feature-flag-per-module*, serta dependency injection memudahkan mocking/testing dan penambahan modul baru tanpa menyentuh modul lain.
- **Prisma** dipilih karena type-safety end-to-end dengan TypeScript, migration yang deklaratif, serta middleware yang mendukung *tenant scoping* otomatis (lihat `04-database.md`).
- **PostgreSQL** dipilih karena mendukung fitur lanjutan (JSONB untuk `config` fleksibel per fitur, row-level constraints, indexing partial) yang cocok untuk kebutuhan multi-tenant shared schema.
- **Redis** digunakan multi-fungsi: cache feature flag (agar tidak query DB tiap request), session store, dan broker BullMQ untuk job asynchronous (notifikasi, generate laporan, sinkronisasi stok).
- **Next.js App Router** dipilih untuk SEO storefront (SSR/ISR produk) sekaligus DX modern untuk admin panel (client-heavy).
- **Turborepo + pnpm** dipilih agar backend, storefront, admin panel, dan package bersama (types, ui-kit, config) berada dalam satu repo yang mudah dikelola AI coding assistant maupun tim kecil.

## 2.8 Versi Node & Tooling yang Wajib Dipatuhi
Dicatat di `.nvmrc` dan `package.json engines`:
```json
{
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```
Semua kontributor (manusia maupun AI) **wajib** menggunakan versi ini agar tidak ada perbedaan perilaku antar environment.
