# 05. API Specification

## 5.1 Prinsip Umum
- REST API, format JSON, versi di path: `/api/v1/...`.
- Base URL berbeda per konteks:
  - Storefront (public/customer): `/api/v1/storefront/...`
  - Admin tenant: `/api/v1/admin/...`
  - Platform super admin: `/api/v1/platform/...`
- Autentikasi via **Bearer JWT** di header `Authorization`.
- Tenant context ditentukan dari **subdomain/custom domain** (resolve di middleware) ATAU dari klaim `tenantId` di JWT untuk request admin — **tidak pernah** dari body/query yang bisa dimanipulasi client.
- Semua response mengikuti *envelope* standar (lihat 5.3).
- Dokumentasi live otomatis tersedia di `/api/docs` (Swagger) — dokumen ini adalah ringkasan kontrak, bukan pengganti Swagger.

## 5.2 Format Umum

### Request Headers
```
Authorization: Bearer <jwt>
Content-Type: application/json
X-Tenant-Id: <hanya untuk platform admin mengakses tenant tertentu>
```

### Response Sukses
```json
{
  "success": true,
  "data": { },
  "meta": { "page": 1, "limit": 20, "total": 134 }
}
```

### Response Error
```json
{
  "success": false,
  "error": {
    "code": "FEATURE_DISABLED",
    "message": "Fitur ini tidak aktif untuk toko Anda.",
    "details": null
  }
}
```

### Kode Error Standar
| Code | HTTP Status | Keterangan |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Input tidak valid (detail di `details`) |
| `UNAUTHORIZED` | 401 | Token tidak ada/invalid/expired |
| `FORBIDDEN` | 403 | Role tidak memiliki izin |
| `FEATURE_DISABLED` | 403 | Fitur dinonaktifkan untuk tenant ini |
| `NOT_FOUND` | 404 | Resource tidak ditemukan / bukan milik tenant ini |
| `CONFLICT` | 409 | Duplikasi (mis. SKU sudah ada) |
| `TENANT_SUSPENDED` | 423 | Tenant sedang suspend |
| `RATE_LIMITED` | 429 | Terlalu banyak request |
| `INTERNAL_ERROR` | 500 | Kesalahan server |

## 5.3 Autentikasi

| Endpoint | Method | Deskripsi | Auth |
|---|---|---|---|
| `/auth/tenant/register` | POST | Daftar UMKM baru (buat Tenant + Owner user) | Public |
| `/auth/tenant/login` | POST | Login staff/owner tenant | Public |
| `/auth/tenant/refresh` | POST | Refresh access token | Refresh token |
| `/auth/customer/register` | POST | Registrasi customer di storefront tenant tsb | Public (tenant-scoped) |
| `/auth/customer/login` | POST | Login customer | Public (tenant-scoped) |
| `/auth/platform/login` | POST | Login super admin platform | Public |
| `/auth/logout` | POST | Invalidate refresh token | Bearer |

## 5.4 Endpoint — Platform Admin (`/api/v1/platform`)

| Endpoint | Method | Deskripsi | Role |
|---|---|---|---|
| `/tenants` | GET | List semua tenant, filter status/plan | PlatformAdmin |
| `/tenants/:id` | GET | Detail tenant | PlatformAdmin |
| `/tenants/:id/status` | PATCH | Ubah status tenant (suspend/aktifkan) | PlatformAdmin |
| `/tenants/:id/plan` | PATCH | Ubah plan tenant | PlatformAdmin |
| `/features` | GET | List semua Feature yang tersedia di sistem | PlatformAdmin |
| `/features` | POST | Tambah Feature baru (jarang, biasanya via migration/seed) | PlatformAdmin |
| `/plans` | GET/POST/PATCH | Kelola paket langganan & entitlement fitur | PlatformAdmin |
| `/audit-logs` | GET | Lihat log platform-wide | PlatformAdmin |

## 5.5 Endpoint — Admin Tenant (`/api/v1/admin`)

### Feature Management
| Endpoint | Method | Deskripsi | Role |
|---|---|---|---|
| `/features` | GET | List fitur beserta status aktif untuk tenant ini | OWNER, ADMIN |
| `/features/:key/toggle` | PATCH | Aktif/nonaktifkan fitur (body: `{ isEnabled, config? }`) | OWNER |

### Catalog
| Endpoint | Method | Deskripsi | Role |
|---|---|---|---|
| `/products` | GET | List produk (pagination, filter status/kategori) | OWNER, ADMIN, STAFF |
| `/products` | POST | Buat produk baru | OWNER, ADMIN |
| `/products/:id` | GET/PATCH/DELETE | Detail/update/soft-delete produk | OWNER, ADMIN |
| `/products/:id/variants` | GET/POST | Kelola varian (butuh fitur `product_variants`) | OWNER, ADMIN |
| `/categories` | GET/POST/PATCH/DELETE | Kelola kategori | OWNER, ADMIN |

### Inventory (butuh fitur `multi_warehouse` untuk multi-gudang; tanpa fitur ini tetap tersedia versi single-warehouse)
| Endpoint | Method | Deskripsi | Role |
|---|---|---|---|
| `/warehouses` | GET/POST/PATCH | Kelola gudang | OWNER, ADMIN |
| `/inventory` | GET | Lihat stok per produk/gudang | OWNER, ADMIN, STAFF |
| `/inventory/adjust` | POST | Penyesuaian stok manual (in/out) | OWNER, ADMIN |

### Orders
| Endpoint | Method | Deskripsi | Role |
|---|---|---|---|
| `/orders` | GET | List order (filter status, tanggal) | OWNER, ADMIN, STAFF, CASHIER |
| `/orders/:id` | GET | Detail order | OWNER, ADMIN, STAFF, CASHIER |
| `/orders/:id/status` | PATCH | Update status order | OWNER, ADMIN, STAFF |
| `/orders/:id/confirm-payment` | POST | Konfirmasi pembayaran manual | OWNER, ADMIN |

### Promotion (butuh fitur `promotion_engine`)
| Endpoint | Method | Deskripsi | Role |
|---|---|---|---|
| `/vouchers` | GET/POST/PATCH/DELETE | Kelola voucher | OWNER, ADMIN |
| `/flash-sales` | GET/POST/PATCH/DELETE | Kelola flash sale | OWNER, ADMIN |

### Loyalty (butuh fitur `loyalty_points`)
| Endpoint | Method | Deskripsi | Role |
|---|---|---|---|
| `/loyalty/settings` | GET/PATCH | Rasio poin, masa berlaku | OWNER |
| `/loyalty/customers/:id/points` | GET | Riwayat poin customer | OWNER, ADMIN |

### Staff & Settings
| Endpoint | Method | Deskripsi | Role |
|---|---|---|---|
| `/staff` | GET/POST/PATCH/DELETE | Kelola akun staff & role | OWNER |
| `/settings` | GET/PATCH | Pengaturan toko (nama, logo, tema, payment due) | OWNER, ADMIN |
| `/reports/sales` | GET | Laporan penjualan (butuh fitur `advanced_reporting` untuk versi lanjutan) | OWNER, ADMIN |

## 5.6 Endpoint — Storefront Publik (`/api/v1/storefront`)

Semua endpoint berikut **tenant-scoped otomatis via subdomain/domain**, tidak butuh auth kecuali disebutkan.

| Endpoint | Method | Deskripsi | Auth |
|---|---|---|---|
| `/store-info` | GET | Info toko (nama, logo, tema, fitur aktif yang relevan ke storefront) | Public |
| `/products` | GET | List produk aktif (search, filter kategori, pagination) | Public |
| `/products/:slug` | GET | Detail produk | Public |
| `/categories` | GET | List kategori | Public |
| `/cart` | GET/POST/PATCH/DELETE | Kelola keranjang (session-based untuk guest, atau terikat customer login) | Public/Customer |
| `/checkout` | POST | Proses checkout → membuat Order | Customer |
| `/checkout/apply-voucher` | POST | Terapkan kode voucher ke keranjang | Public/Customer (butuh fitur `promotion_engine`) |
| `/orders` | GET | Riwayat order customer login | Customer |
| `/orders/:id` | GET | Detail order + status tracking | Customer |
| `/payment/webhook/midtrans` | POST | Webhook callback dari Midtrans | Signature verification (bukan JWT) |
| `/payment/webhook/xendit` | POST | Webhook callback dari Xendit | Signature verification |
| `/shipping/calculate` | POST | Hitung ongkir (butuh fitur `auto_shipping`) | Public |

## 5.7 Pagination Standar
Query params: `?page=1&limit=20&sortBy=createdAt&sortOrder=desc`
Response `meta`:
```json
{ "page": 1, "limit": 20, "total": 134, "totalPages": 7 }
```

## 5.8 Feature-Gated Endpoint Behavior
Endpoint yang bergantung pada fitur non-core **wajib** menggunakan decorator `@RequireFeature('feature_key')` di controller. Jika fitur nonaktif, response:
```json
{
  "success": false,
  "error": {
    "code": "FEATURE_DISABLED",
    "message": "Fitur multi-gudang tidak aktif untuk toko ini.",
    "details": { "featureKey": "multi_warehouse" }
  }
}
```
HTTP status: `403`.

## 5.9 Idempotency
Endpoint yang menyebabkan efek finansial/stok (checkout, webhook pembayaran, penyesuaian stok) wajib mendukung header `Idempotency-Key` untuk mencegah duplikasi akibat retry jaringan.

## 5.10 Rate Limiting
- Endpoint publik storefront: 60 request/menit/IP (default, dikonfigurasi via `@nestjs/throttler`).
- Endpoint auth (login/register): 5 request/menit/IP untuk mencegah brute force.
- Webhook payment: tidak di-rate-limit oleh IP customer, namun divalidasi signature ketat.
