# 08. Coding Standards

## 8.0 Pola Desain & Arsitektur yang Dipakai
Ringkasan pola yang **wajib** diikuti konsisten di seluruh proyek — jangan memperkenalkan pola arsitektur baru tanpa mendiskusikannya dulu (lihat `15-ai-development-rules.md` §15.4.1 soal batas scope).

| Pola | Diterapkan di | Tujuan |
|---|---|---|
| **Modular Monolith** | Backend NestJS (`core/`, `modules/`, `platform/`) | Satu deployment, tapi modul terisolasi agar mudah dipecah ke service terpisah nanti (`07-folder-structure.md`) |
| **Dependency Injection** | Seluruh service NestJS | Testability, decoupling antar modul (bawaan NestJS) |
| **Repository via Prisma Client** | Semua akses data | Tidak ada raw SQL tersebar; Prisma Client sebagai satu-satunya jalur ke database (`08.2` §6) |
| **DTO + Validation Pipe** | Semua input HTTP | Validasi terpusat, tidak ada validasi manual ad-hoc di service (`10-validation-rules.md`) |
| **Guard Chain (Auth → Feature → Role)** | Semua endpoint terproteksi | Urutan pemeriksaan konsisten & dapat diprediksi (`11-permissions.md` §11.6) |
| **Strategy-like module per provider** | `payment-gateway/{midtrans,xendit}`, `shipping/{manual,auto-rate}` | Menambah provider baru tanpa mengubah kode provider lain |
| **Feature Flag / Toggle Pattern** | Seluruh fitur non-core | Inti pembeda produk ini — lihat `03-business-rules.md` §3.2 |
| **CQRS-lite (implisit)** | Service dengan operasi baca berat (laporan) dipisah dari operasi tulis (order/checkout) | Memudahkan optimasi query baca tanpa mengganggu jalur transaksi kritis — belum menggunakan CQRS library eksplisit, cukup pemisahan method/service |
| **Server State vs Client State Separation** | Frontend (TanStack Query vs Zustand) | Mencegah cache data server tercampur state UI lokal (`13-state-management.md`) |
| **Server Components by default** | Next.js App Router | Performance-first, `'use client'` hanya saat perlu interaktivitas |

Jika sebuah task tampaknya membutuhkan pola baru yang tidak ada di tabel ini (mis. Event Sourcing, Microservices terpisah, GraphQL), itu adalah **keputusan arsitektur besar** yang harus didiskusikan dan didokumentasikan dulu di `docs/`, bukan diputuskan sepihak di tengah task fitur.

## 8.1 TypeScript
1. `strict: true` wajib aktif di semua `tsconfig.json` (root & per-package).
2. **Dilarang** menggunakan `any` kecuali dengan komentar justifikasi eksplisit `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- alasan`. Gunakan `unknown` + type guard sebagai gantinya.
3. Semua fungsi publik (exported) wajib memiliki tipe return eksplisit — jangan mengandalkan inference untuk API publik antar modul.
4. Gunakan `interface` untuk bentuk objek/kontrak yang bisa di-extend, `type` untuk union/intersection/utility types.
5. Hindari `enum` TypeScript untuk domain yang sudah direpresentasikan sebagai Prisma enum — reuse tipe dari `@prisma/client` agar tidak duplikasi/divergen.

## 8.2 NestJS (Backend)
1. **Satu tanggung jawab per Service** — jangan campur logika order dengan logika payment dalam satu service; gunakan dependency injection antar service.
2. Controller **tidak boleh** berisi logika bisnis — hanya menerima request, memanggil service, mengembalikan response. Validasi kompleks (selain shape DTO) tetap di service/domain layer.
3. Semua endpoint yang butuh tenant context wajib menggunakan decorator `@CurrentTenant()` (diambil dari request yang sudah di-resolve middleware), **dilarang** mempercayai `tenantId` dari body/query request.
4. Setiap modul opsional wajib mendaftarkan dependency ke `FeatureFlagGuard` — lihat contoh:
```typescript
@UseGuards(JwtAuthGuard, RolesGuard, FeatureFlagGuard)
@RequireFeature('multi_warehouse')
@Roles('OWNER', 'ADMIN')
@Controller('admin/warehouses')
export class WarehouseController { ... }
```
5. Gunakan `DTO` + `class-validator` untuk **setiap** input, termasuk query params list (`ListProductQueryDto`), tidak hanya body.
6. Error dilempar sebagai NestJS exception bawaan (`BadRequestException`, `ForbiddenException`, dsb) dengan `error.code` custom lewat exception filter global — jangan `throw new Error()` polos.
7. Gunakan transaction Prisma (`prisma.$transaction`) untuk operasi yang menyentuh lebih dari satu tabel dan harus atomic (contoh: checkout yang mengurangi stok + membuat order + membuat order item).

## 8.3 React / Next.js (Frontend)
1. Gunakan **Server Components** secara default di Next.js App Router; tambahkan `'use client'` hanya jika memang butuh interaktivitas (state, event handler, browser API).
2. Data fetching server-side (SSR/ISR) untuk halaman publik storefront (SEO-sensitive); TanStack Query untuk data yang butuh refetch/interaktif di admin panel dan bagian dinamis storefront (keranjang, dsb).
3. **Dilarang** fetch data langsung di dalam komponen client tanpa lewat TanStack Query — semua data-fetching client wajib melalui custom hook (`useProducts()`, `useOrders()`, dst) di folder `hooks/`.
4. Komponen React maksimal ~150-200 baris; jika lebih, pecah menjadi sub-komponen.
5. Props komponen wajib memiliki interface eksplisit (`ProductCardProps`), tidak inline anonymous object types untuk komponen yang dipakai lebih dari sekali.
6. Nama komponen file: `PascalCase.tsx` untuk komponen, `kebab-case.ts` untuk util/hook (`use-feature.ts`).

## 8.4 Penamaan (Naming Conventions)
| Elemen | Konvensi | Contoh |
|---|---|---|
| File NestJS | kebab-case + suffix jenis | `product.service.ts`, `create-product.dto.ts` |
| File React komponen | PascalCase | `ProductCard.tsx` |
| File hook/util | kebab-case | `use-cart.ts`, `format-currency.ts` |
| Class | PascalCase | `ProductService` |
| Interface/Type | PascalCase, tanpa prefix `I` | `Product`, `CreateProductInput` |
| Variabel/fungsi | camelCase | `getProductById` |
| Konstanta global | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE` |
| Enum Prisma/DB | UPPER_SNAKE_CASE value, PascalCase nama | `OrderStatus.PENDING_PAYMENT` |
| Feature flag key | snake_case | `multi_warehouse`, `loyalty_points` |
| Route/endpoint | kebab-case | `/admin/flash-sales` |

## 8.5 Struktur Import
Urutan import (dipaksa via ESLint `import/order`):
1. Node built-in / eksternal packages
2. Alias internal monorepo (`@ucp/types`, `@ucp/ui`, dst)
3. Alias relatif dalam app (`@/components`, `@/lib`)
4. Relative import (`./`, `../`)

## 8.6 Error Handling
1. Backend: semua exception ditangkap `AllExceptionsFilter` global yang mengonversi ke format envelope error standar (`05-api-spec.md` §5.2).
2. Frontend: gunakan error boundary per halaman/segmen (`error.tsx` Next.js) + toast untuk error non-blocking (mis. gagal toggle fitur tunggal).
3. **Dilarang** menelan (`swallow`) error tanpa logging — minimal `logger.error()` dengan konteks (tenantId, userId, action).

## 8.7 Logging
- Gunakan `Pino` (via `nestjs-pino`) dengan structured log, wajib menyertakan `tenantId` dan `requestId` di setiap log request-scoped.
- Level log: `error` untuk kegagalan sistem, `warn` untuk kondisi tidak normal tapi ter-handle (mis. percobaan akses fitur nonaktif), `info` untuk event bisnis penting (order dibuat, fitur di-toggle), `debug` untuk detail development (nonaktif di production).

## 8.8 Testing
1. Setiap service backend wajib memiliki unit test untuk **business logic**-nya (bukan sekadar CRUD trivial), minimal untuk: perhitungan harga checkout, pengurangan stok, validasi feature dependency, perhitungan poin loyalty.
2. E2E test (Supertest) wajib mencakup alur kritis: register tenant → login → create product → checkout → order status berubah.
3. Frontend: unit test untuk util murni dan hook kompleks; Playwright e2e minimal untuk flow checkout storefront dan toggle fitur di admin.
4. Target coverage minimum **70%** untuk modul `core/`, **50%** untuk modul opsional di `modules/` (dinaikkan bertahap).

## 8.9 Komentar & Dokumentasi Kode
1. Komentar menjelaskan **mengapa**, bukan **apa** (kode sudah menjelaskan "apa" jika ditulis jelas).
2. Setiap service method yang mengandung business rule non-trivial wajib memiliki JSDoc singkat merujuk ke bagian relevan `03-business-rules.md`, contoh:
```typescript
/**
 * Mengurangi stok produk saat checkout.
 * Business rule: 03-business-rules.md §3.3.3 — stok tidak boleh negatif,
 * operasi harus atomic untuk mencegah overselling.
 */
async decrementStock(...) { ... }
```

## 8.10 Larangan Umum
- Dilarang hardcode `tenantId`, kredensial, atau API key payment gateway di kode — semua lewat `.env` atau `TenantFeature.config` (terenkripsi untuk data sensitif, lihat `14-non-functional.md`).
- Dilarang membuat query Prisma tanpa filter `tenantId` untuk model yang tenant-scoped (kecuali di modul `platform/` yang memang lintas tenant, dan itu pun wajib role `PlatformAdmin`).
- Dilarang menonaktifkan aturan ESLint secara blanket (`/* eslint-disable */` di top file) — disable per baris dengan justifikasi jika benar-benar diperlukan.