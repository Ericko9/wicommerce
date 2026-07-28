# 10. Validation Rules

## 10.1 Prinsip Umum
1. Validasi **wajib** dilakukan di backend (source of truth) menggunakan `class-validator` pada setiap DTO — validasi frontend (Zod + React Hook Form) adalah lapisan UX tambahan, **bukan pengganti**.
2. Skema validasi frontend (Zod) dan backend (class-validator) harus selaras nilainya (batas panjang, format) — idealnya konstanta batas (`MAX_PRODUCT_NAME_LENGTH`, dst) didefinisikan sekali di `packages/utils/constants` dan direferensikan kedua sisi.
3. Semua pesan error validasi yang ditampilkan ke user (tenant admin/customer) dalam Bahasa Indonesia; kode error tetap Bahasa Inggris (`VALIDATION_ERROR`).

## 10.2 Validasi — Tenant & Registrasi

| Field | Aturan |
|---|---|
| `storeName` | required, 3–50 karakter |
| `subdomain` | required, 3–30 karakter, lowercase, hanya `a-z0-9-`, tidak boleh diawali/diakhiri `-`, unik, tidak boleh dari daftar reserved (`www`, `api`, `admin`, `app`, dst) |
| `ownerEmail` | required, format email valid, unik secara global (satu email = satu akun owner, meski bisa punya banyak tenant di fase lanjut) |
| `ownerPassword` | required, minimal 8 karakter, kombinasi huruf & angka |
| `customDomain` (opsional) | format domain valid, verifikasi DNS CNAME sebelum diaktifkan |

## 10.3 Validasi — Produk

| Field | Aturan |
|---|---|
| `name` | required, 3–150 karakter |
| `slug` | auto-generate dari `name` (dapat diedit), unik per tenant, format kebab-case |
| `basePrice` | required, integer, minimal 0, maksimal sesuai batas wajar (mis. 999.999.999) |
| `description` | opsional, maksimal 5000 karakter |
| `categoryId` | opsional, jika diisi wajib milik tenant yang sama |
| `sku` (di level varian) | required jika `product_variants` aktif, unik per produk |
| Upload gambar | maksimal 5MB per file, format `jpg/jpeg/png/webp`, maksimal 8 gambar per produk |

## 10.4 Validasi — Stok/Inventory

| Field | Aturan |
|---|---|
| `quantity` (adjust) | integer, tidak boleh membuat stok akhir < 0 |
| `warehouseId` | wajib milik tenant yang sama; jika fitur `multi_warehouse` nonaktif, hanya boleh mengarah ke warehouse `isDefault = true` |

## 10.5 Validasi — Order / Checkout

| Field | Aturan |
|---|---|
| `items` | minimal 1 item, tiap item `quantity >= 1` |
| Stok tersedia | divalidasi ulang di server saat checkout (bukan hanya saat add to cart) — mencegah race condition/stok berubah |
| `shippingAddress` | required semua sub-field (`recipient`, `phone`, `fullAddress`, `city`, `province`, `postalCode`) |
| `phone` | format nomor Indonesia valid (`08xxxxxxxxxx` atau `+62xxxxxxxxxx`) |
| `paymentMethod` | wajib salah satu dari metode yang **aktif** untuk tenant tsb (divalidasi terhadap `TenantFeature`) |
| `voucherCode` | jika diisi, wajib valid, belum melebihi `usageLimit`/`usageLimitPerCustomer`, dan dalam rentang `startAt`–`endAt` |
| Total akhir | dihitung ulang di server dari harga produk saat ini + diskon — **tidak pernah** dipercaya dari input client |

## 10.6 Validasi — Feature Toggle

| Aturan |
|---|
| Fitur dengan `isCore = true` tidak dapat menerima request toggle (`400 CANNOT_MODIFY_CORE_FEATURE`) |
| Menonaktifkan fitur yang menjadi dependency fitur lain yang sedang aktif akan ditolak (`409 FEATURE_HAS_ACTIVE_DEPENDENTS`) kecuali request menyertakan `cascadeDisable: true` secara eksplisit dari UI konfirmasi |
| Mengaktifkan fitur yang bukan bagian entitlement plan tenant (dan bukan add-on yang dibeli) ditolak (`403 FEATURE_NOT_IN_PLAN`) — kecuali untuk fitur yang memang bebas aktif di semua plan |
| Field `config` (JSON) divalidasi terhadap skema spesifik per fitur (mis. `payment_midtrans.config` wajib punya `merchantId`, `clientKey`) menggunakan Zod schema per-feature di backend |

## 10.7 Validasi — Voucher/Promosi

| Field | Aturan |
|---|---|
| `code` | required, 3–20 karakter, uppercase alfanumerik, unik per tenant |
| `value` | jika `type = PERCENTAGE`, rentang 1–100; jika `type = FIXED`, minimal 1 (rupiah) |
| `startAt` / `endAt` | `endAt` wajib setelah `startAt` |
| `usageLimit` / `usageLimitPerCustomer` | jika diisi, integer positif |

## 10.8 Validasi — Loyalty

| Field | Aturan |
|---|---|
| `loyaltyPointRatio` | integer positif (Rupiah per 1 poin), minimal 100 |
| Penukaran poin | tidak boleh melebihi saldo poin customer saat ini (dicek ulang di server, transaksi atomic) |

## 10.9 Validasi — Staff/User

| Field | Aturan |
|---|---|
| `email` | required, format valid, unik per tenant (kombinasi `tenantId + email`) |
| `role` | wajib salah satu dari enum `TenantRole`; hanya `OWNER` yang bisa membuat `OWNER` lain atau mengubah role staff |
| Penghapusan staff terakhir dengan role `OWNER` | dilarang (tenant wajib punya minimal 1 Owner aktif) |

## 10.10 Validasi File Upload Umum
- Semua upload melalui endpoint pre-signed URL ke object storage (bukan upload langsung lewat body JSON/base64) untuk efisiensi.
- Validasi tipe MIME dilakukan di server sebelum generate pre-signed URL, bukan hanya mengandalkan ekstensi file.
- Maksimal ukuran file bervariasi per konteks: gambar produk 5MB, logo toko 2MB, dokumen (jika ada fitur upload bukti transfer manual) 3MB (`jpg/png/pdf`).

## 10.11 Sanitasi Input
- Semua input teks bebas (deskripsi produk, nama toko, dsb) di-sanitasi dari HTML/script berbahaya sebelum disimpan (mencegah stored XSS) — gunakan library seperti `sanitize-html` di layer service sebelum persist, khususnya untuk field yang di-render sebagai rich text di storefront.
- Query parameter untuk search/filter di-escape sebelum digunakan dalam query (Prisma parameterized query sudah menangani ini secara default — dilarang membangun raw SQL string dari input user).
