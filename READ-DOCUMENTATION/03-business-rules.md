# 03. Business Rules

## 3.1 Konsep Tenant
- Satu **Tenant** = satu UMKM = satu toko.
- Tenant diidentifikasi lewat **subdomain** (`namatoko.ucp.id`) atau **custom domain** (`www.namatoko.com` via CNAME).
- Semua data operasional (produk, order, customer, dll.) **wajib** memiliki `tenantId` dan tidak boleh diakses lintas tenant kecuali oleh Super Admin platform.
- Tenant memiliki status: `PENDING` (baru daftar, belum verifikasi) → `ACTIVE` → `SUSPENDED` (mis. langganan habis/pelanggaran) → `CLOSED`.

## 3.2 Sistem Feature Flag

### 3.2.1 Definisi
- **Feature** = unit fungsional yang bisa diaktifkan/nonaktifkan, contoh: `payment_gateway_midtrans`, `multi_warehouse`, `loyalty_points`.
- Feature punya properti `isCore` — jika `true`, fitur **tidak bisa** dinonaktifkan tenant manapun (contoh: `product_catalog`, `checkout`, `order_management`).
- Setiap tenant punya baris `TenantFeature` untuk tiap Feature yang relevan, dengan `isEnabled` dan `config` (JSON bebas untuk parameter fitur, misalnya API key payment gateway milik tenant tsb).

### 3.2.2 Aturan Aktivasi
1. Saat tenant baru dibuat, sistem otomatis membuat baris `TenantFeature` untuk semua Feature `isCore = true` dengan `isEnabled = true`, dan fitur-fitur default sesuai `plan` yang dipilih.
2. Tenant Owner dapat mengaktifkan/menonaktifkan fitur **non-core** dari Admin Panel, selama fitur tersebut termasuk dalam entitlement paketnya (atau dibeli sebagai add-on).
3. Fitur yang dinonaktifkan **tidak menghapus data** — hanya menyembunyikan UI dan menonaktifkan endpoint terkait (guard menolak dengan `403 FEATURE_DISABLED`). Ini memungkinkan tenant mengaktifkan kembali fitur tanpa kehilangan histori data.
4. Beberapa fitur punya **dependency** (contoh: `flash_sale` membutuhkan `promotion_engine` aktif). Sistem harus mencegah aktivasi fitur dependen tanpa fitur induknya (divalidasi di service layer, lihat `12-workflows.md`).
5. Perubahan status fitur tenant wajib tercatat di **audit log** (siapa, kapan, dari-ke apa).

### 3.2.3 Caching Feature Flag
- Status fitur per tenant di-cache di Redis dengan key `feature:{tenantId}:{featureKey}`, TTL 5 menit atau di-invalidate langsung saat ada perubahan (event-driven invalidation lebih diutamakan daripada TTL semata).
- Guard NestJS (`FeatureFlagGuard`) mengecek Redis dahulu sebelum fallback ke database.

## 3.3 Aturan Katalog Produk
1. Produk wajib punya minimal: nama, SKU (unik per tenant, bukan global), harga, stok, status (`DRAFT`, `ACTIVE`, `ARCHIVED`).
2. Produk dengan varian (ukuran, warna, dll.) hanya tersedia jika fitur `product_variants` aktif; jika tidak aktif, produk hanya punya satu SKU tunggal.
3. Stok tidak boleh negatif. Setiap pengurangan stok akibat order harus atomic (menggunakan transaction/row lock) untuk mencegah overselling saat concurrent checkout.
4. Produk yang stoknya habis otomatis berstatus `OUT_OF_STOCK` di storefront, tetap terlihat kecuali tenant mengatur untuk menyembunyikannya (`hideWhenOutOfStock` di setting toko).

## 3.4 Aturan Order & Checkout
1. Order melalui status baku:
   `PENDING_PAYMENT` → `PAID` → `PROCESSING` → `SHIPPED` → `COMPLETED`
   dengan cabang: `CANCELLED`, `REFUNDED` (jika fitur refund aktif), `EXPIRED` (pembayaran manual yang tidak dikonfirmasi dalam batas waktu).
2. Jika fitur `payment_gateway` (Midtrans/Xendit) **tidak aktif**, tenant wajib punya minimal satu metode pembayaran manual (transfer bank/COD) aktif — sistem harus mencegah tenant menonaktifkan seluruh metode pembayaran hingga tidak tersisa satupun.
3. Batas waktu pembayaran manual default 24 jam sejak order dibuat (`dapat dikonfigurasi per tenant`); order otomatis `EXPIRED` oleh scheduled job jika lewat batas dan belum dikonfirmasi.
4. Perubahan status order (mis. konfirmasi pembayaran manual oleh admin) wajib tercatat di `OrderStatusHistory` beserta aktor dan waktunya.
5. Harga final order (`totalAmount`) dihitung dan **disimpan sebagai snapshot** saat checkout (tidak mengikuti perubahan harga produk setelahnya).

## 3.5 Aturan Multi-Gudang (jika fitur `multi_warehouse` aktif)
1. Tenant dapat memiliki lebih dari satu `Warehouse`/cabang.
2. Stok dikelola per gudang (`InventoryItem` per `productId` + `warehouseId`).
3. Saat fitur ini **nonaktif**, sistem menggunakan satu gudang default (`isDefault = true`) secara implisit — tidak ada perubahan skema, hanya UI yang disederhanakan.

## 3.6 Aturan Promosi & Diskon (jika fitur `promotion_engine` aktif)
1. Tipe promosi: voucher kode, diskon otomatis (persentase/nominal), flash sale (waktu terbatas + stok terbatas).
2. Voucher tidak boleh dipakai melebihi `usageLimit` (global) maupun `usageLimitPerCustomer`.
3. Promosi tidak boleh membuat harga akhir menjadi negatif (floor di 0, atau ditolak validasi jika diskon > subtotal).
4. Flash sale memiliki jendela waktu (`startAt`, `endAt`); di luar jendela waktu tersebut, harga normal berlaku otomatis (dicek real-time, tidak memerlukan job terjadwal untuk switch harga).

## 3.7 Aturan Loyalty Program (jika fitur `loyalty_points` aktif)
1. Poin didapat dari order `COMPLETED` (bukan `PAID`, untuk menghindari fraud melalui pembatalan setelah dapat poin).
2. Rasio poin (misal Rp10.000 = 1 poin) dikonfigurasi per tenant.
3. Penukaran poin tidak boleh membuat saldo poin customer negatif.
4. Poin punya masa berlaku opsional (`expiredAt`), dikonfigurasi per tenant; job terjadwal membersihkan poin kedaluwarsa.

## 3.8 Aturan RBAC (Role-Based Access Control)
Detail lengkap di `11-permissions.md`. Ringkasan prinsip:
1. Role bersifat **scoped ke tenant** — user staff hanya berlaku untuk satu tenant (kecuali Super Admin platform).
2. Aksi sensitif (hapus produk, refund, ubah harga) memerlukan role minimal tertentu, dicatat di audit log.
3. Fitur RBAC granular (custom role per tenant) adalah fitur **opsional** (`custom_roles`); default-nya tenant hanya punya role baku (Owner, Admin, Staff, Kasir).

## 3.9 Aturan Langganan Platform (Tenant ↔ Plan)
1. Tenant terikat pada satu `Plan` aktif pada satu waktu.
2. Saat tenant upgrade/downgrade plan, sistem menyesuaikan `TenantFeature.isEnabled` berdasarkan entitlement plan baru — namun **tidak** menonaktifkan fitur yang sudah diaktifkan manual sebagai add-on berbayar terpisah (jika model bisnis mendukung add-on individual).
3. Tenant dengan status `SUSPENDED` (misal telat bayar langganan) — storefront menampilkan halaman "toko tidak aktif", Admin Panel tetap bisa diakses read-only untuk keperluan ekspor data.

## 3.10 Audit & Data Retention
1. Semua perubahan data penting (order, produk, feature flag, user role) tercatat di tabel `AuditLog` (siapa, kapan, aksi, before/after jika relevan).
2. Data tenant yang `CLOSED` disimpan minimal 90 hari sebelum penghapusan permanen (soft delete → hard delete via job terjadwal), untuk kepatuhan dan kemungkinan reaktivasi.
