# 07. Folder Structure

## 7.1 Struktur Monorepo (Turborepo + pnpm workspaces)

```
ucp-platform/
├── apps/
│   ├── api/                       # NestJS backend
│   ├── storefront/                # Next.js — customer-facing
│   └── admin/                     # Next.js — tenant & platform admin
├── packages/
│   ├── database/                  # Prisma schema + generated client (shared)
│   ├── types/                     # Shared TypeScript types/DTO interfaces
│   ├── ui/                        # Shared React component library (shadcn-based)
│   ├── config/                    # Shared ESLint/Tailwind/TSConfig base
│   └── utils/                     # Shared pure utility functions (format currency, dsb)
├── docs/                          # <- dokumentasi ini
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   └── Dockerfile.api / Dockerfile.web
├── .github/workflows/             # CI/CD
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── .env.example
```

## 7.2 Struktur `apps/api` (NestJS — Modular Monolith)

```
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── core/                      # Modul WAJIB, tidak feature-flagged
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/        # jwt.strategy.ts, local.strategy.ts
│   │   │   └── dto/
│   │   ├── tenant/
│   │   │   ├── tenant.module.ts
│   │   │   ├── tenant.service.ts
│   │   │   └── tenant.controller.ts
│   │   ├── user/
│   │   ├── catalog/                # produk & kategori dasar (core)
│   │   └── order/                  # order & checkout dasar (core)
│   │
│   ├── modules/                    # Modul OPSIONAL (feature-flagged)
│   │   ├── product-variants/
│   │   ├── multi-warehouse/
│   │   ├── promotion/
│   │   │   ├── voucher/
│   │   │   └── flash-sale/
│   │   ├── loyalty/
│   │   ├── payment-gateway/
│   │   │   ├── midtrans/
│   │   │   └── xendit/
│   │   ├── shipping/
│   │   │   ├── manual/
│   │   │   └── auto-rate/
│   │   ├── pos/
│   │   ├── advanced-reporting/
│   │   └── marketplace-sync/
│   │
│   ├── platform/                   # Modul khusus Super Admin
│   │   ├── platform-admin/
│   │   ├── plan-management/
│   │   └── feature-management/
│   │
│   ├── common/                     # Cross-cutting concerns
│   │   ├── decorators/             # @RequireFeature, @CurrentTenant, @Roles
│   │   ├── guards/                 # FeatureFlagGuard, RolesGuard, JwtAuthGuard
│   │   ├── interceptors/           # ResponseEnvelopeInterceptor, LoggingInterceptor
│   │   ├── filters/                # AllExceptionsFilter
│   │   ├── middleware/             # TenantResolverMiddleware (subdomain → tenantId)
│   │   ├── pipes/                  # ValidationPipe config
│   │   └── prisma/                 # PrismaService + tenant extension
│   │
│   ├── jobs/                       # BullMQ processors
│   │   ├── order-expiry.processor.ts
│   │   ├── loyalty-expiry.processor.ts
│   │   └── notification.processor.ts
│   │
│   └── config/                     # ConfigModule (env validation via zod/joi)
│
├── test/                           # e2e tests
├── prisma -> symlink ke packages/database/prisma
└── package.json
```

### Aturan Struktur Modul (berlaku untuk `core/` dan `modules/`)
Setiap modul fitur **wajib** mengikuti pola konsisten:
```
feature-name/
├── feature-name.module.ts
├── feature-name.controller.ts
├── feature-name.service.ts
├── dto/
│   ├── create-feature-name.dto.ts
│   └── update-feature-name.dto.ts
├── entities/ (jika perlu representasi non-Prisma)
└── feature-name.service.spec.ts
```
Modul di `modules/` (opsional) **wajib** meng-import dan menggunakan `FeatureFlagGuard` di seluruh controller-nya via decorator `@RequireFeature('key')` di level controller atau per-route.

## 7.3 Struktur `apps/storefront` (Next.js App Router)

```
apps/storefront/
├── app/
│   ├── (storefront)/
│   │   ├── page.tsx                # homepage toko
│   │   ├── products/
│   │   │   ├── page.tsx            # list produk
│   │   │   └── [slug]/page.tsx     # detail produk
│   │   ├── cart/page.tsx
│   │   ├── checkout/page.tsx
│   │   ├── orders/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── layout.tsx              # layout dgn tema dinamis per tenant
│   ├── api/                        # route handlers ringan bila perlu (BFF minor)
│   └── layout.tsx
├── middleware.ts                   # resolve subdomain -> tenant context
├── components/
│   ├── product/
│   ├── cart/
│   └── checkout/
├── lib/
│   ├── api-client.ts
│   ├── query-client.ts
│   └── tenant-theme.ts
├── hooks/
│   └── use-feature.ts
└── package.json
```

## 7.4 Struktur `apps/admin` (Next.js App Router)

```
apps/admin/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # sidebar dinamis berdasarkan feature aktif
│   │   ├── dashboard/page.tsx
│   │   ├── products/
│   │   ├── orders/
│   │   ├── features/page.tsx       # halaman toggle fitur (lihat 06-ui-guidelines §6.6)
│   │   ├── staff/
│   │   ├── settings/
│   │   └── reports/
│   ├── (platform)/                 # khusus super admin, route group terpisah
│   │   ├── tenants/
│   │   ├── plans/
│   │   └── features/
│   └── layout.tsx
├── components/
│   ├── layout/                     # Sidebar, Topbar
│   ├── feature-flags/
│   └── ui/                         # re-export dari packages/ui
├── hooks/
│   └── use-feature.ts              # sama pola dengan storefront, sumber dari packages/utils
├── lib/
└── package.json
```

## 7.5 Struktur `packages/database`

```
packages/database/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   └── index.ts                    # export PrismaClient + tenant extension helper
└── package.json
```

## 7.6 Struktur `packages/types`
Berisi tipe/DTO yang dipakai bersama backend & frontend agar kontrak API konsisten (dihasilkan manual atau via OpenAPI codegen dari Swagger):
```
packages/types/
├── src/
│   ├── product.types.ts
│   ├── order.types.ts
│   ├── feature.types.ts
│   ├── api-envelope.types.ts       # ApiResponse<T>, PaginatedResponse<T>
│   └── index.ts
└── package.json
```

## 7.7 Aturan Penempatan File (Ringkas)
| Jenis kode | Lokasi |
|---|---|
| Logika bisnis backend | `apps/api/src/{core,modules}/**/*.service.ts` |
| Endpoint HTTP | `apps/api/src/{core,modules}/**/*.controller.ts` |
| Validasi input | `apps/api/src/**/dto/*.dto.ts` (class-validator) |
| Query database | Hanya lewat Prisma service, tidak ada raw SQL di controller/service acak — kecuali di `common/prisma/raw-queries` dengan justifikasi performa |
| Komponen UI dipakai admin & storefront | `packages/ui` |
| Komponen spesifik satu app | `apps/{app}/components` |
| Util murni (format currency, dsb) | `packages/utils` |
| Tipe/DTO bersama | `packages/types` |
