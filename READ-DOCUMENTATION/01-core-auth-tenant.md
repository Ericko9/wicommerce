# Task 01: Core — Skema Database, Tenant, Auth & Feature Flag Engine

## Status
- [ ] Belum dikerjakan

## Tipe
Core

## Konteks
Ini adalah fondasi paling kritis dari seluruh sistem: model multi-tenant, autentikasi, dan mesin feature flag yang menjadi pembeda utama produk ini. Semua fitur lain bergantung pada task ini.

## Dokumen Referensi
- docs/03-business-rules.md (§3.1, §3.2)
- docs/04-database.md (seluruh skema inti: Tenant, TenantSetting, Feature, TenantFeature, TenantUser, Plan, PlanFeature)
- docs/05-api-spec.md (§5.3 Autentikasi, endpoint `/features`)
- docs/11-permissions.md
- docs/12-workflows.md (§12.1 Onboarding, §12.2 Toggle Feature)

## Dependency
Task 00 (Setup Monorepo)

## Scope Pekerjaan
1. Implementasikan skema Prisma penuh untuk model: `Tenant`, `TenantSetting`, `Plan`, `PlanFeature`, `Feature`, `TenantFeature`, `TenantUser`, `PlatformAdmin`, `AuditLog` sesuai `04-database.md`.
2. Buat seed data: 3 Plan default (basic/pro/enterprise), daftar Feature awal (minimal: `product_catalog` (core), `checkout` (core), `order_management` (core), `product_variants`, `multi_warehouse`, `payment_midtrans`, `payment_xendit`, `promotion_engine`, `loyalty_points`, `advanced_reporting`), beserta `PlanFeature` mapping-nya.
3. Implementasikan Prisma tenant-scoping extension sesuai `04-database.md` §4.3.
4. Implementasikan modul `core/auth`: register tenant, login tenant user, login customer (skeleton, detail customer di task katalog/order), refresh token, logout. JWT access (15m) + refresh (7d, httpOnly cookie).
5. Implementasikan modul `core/tenant`: resolve tenant dari subdomain/custom domain via middleware (`TenantResolverMiddleware`), CRUD dasar tenant settings.
6. Implementasikan feature flag engine:
   - `FeatureFlagGuard` + decorator `@RequireFeature()`
   - Service untuk get/toggle fitur, termasuk validasi core/dependency (`03-business-rules.md` §3.2.2)
   - Cache Redis untuk status fitur per tenant + invalidation saat toggle
7. Implementasikan `RolesGuard` + decorator `@Roles()` sesuai `11-permissions.md`.
8. Implementasikan endpoint `GET /admin/features` dan `PATCH /admin/features/:key/toggle`.
9. Audit log otomatis untuk: tenant dibuat, feature ditoggle.
10. Unit test: feature flag core tidak bisa dinonaktifkan, dependency check, tenant isolation pada query dasar.
11. E2E test: alur registrasi tenant lengkap → login → toggle salah satu fitur non-core.

## Kriteria Selesai (Acceptance Criteria)
- [ ] Registrasi tenant baru menghasilkan Tenant + Owner + TenantSetting + Warehouse default + TenantFeature core aktif + TenantFeature sesuai plan basic, sesuai workflow `12-workflows.md` §12.1.
- [ ] Login tenant user menghasilkan access + refresh token valid.
- [ ] Request ke endpoint dengan `@RequireFeature('key_nonaktif')` mengembalikan `403 FEATURE_DISABLED`.
- [ ] Percobaan menonaktifkan fitur `isCore=true` mengembalikan `400 CANNOT_MODIFY_CORE_FEATURE`.
- [ ] Percobaan menonaktifkan fitur yang punya dependent aktif mengembalikan `409 FEATURE_HAS_ACTIVE_DEPENDENTS` tanpa `cascadeDisable`.
- [ ] Query produk/order (meski modelnya belum diisi data di task ini, cukup test dengan model yang sudah ada) terbukti tidak bisa mengakses data tenant lain.
- [ ] Semua endpoint terdokumentasi di Swagger dan selaras dengan `05-api-spec.md`.
- [ ] Test coverage modul ini ≥ 70% sesuai target core (`08-coding-standards.md` §8.8).

## Di Luar Scope
- Implementasi katalog produk, order, checkout penuh (task terpisah).
- UI Admin Panel untuk halaman "Manajemen Fitur" (task frontend terpisah, backend-nya sudah siap di task ini).
- Custom roles (fitur opsional lanjutan, task terpisah setelah RBAC dasar stabil).
