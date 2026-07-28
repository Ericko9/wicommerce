# Task 02: Core — Katalog Produk & Inventory Dasar

## Status
- [ ] Belum dikerjakan

## Tipe
Core

## Konteks
Katalog produk adalah fitur inti yang wajib ada di semua tenant, menjadi dasar sebelum order/checkout dapat dibangun.

## Dokumen Referensi
- docs/03-business-rules.md (§3.3 Aturan Katalog Produk, §3.5 Multi-Gudang)
- docs/04-database.md (Category, Product, ProductImage, ProductVariant, Warehouse, InventoryItem)
- docs/05-api-spec.md (Catalog & Inventory endpoints)
- docs/10-validation-rules.md (§10.3, §10.4)

## Dependency
Task 01 (Core Auth & Tenant)

## Scope Pekerjaan
1. Implementasikan modul `core/catalog`: CRUD Category, CRUD Product (tanpa varian dulu — single SKU implisit).
2. Implementasikan upload gambar produk via pre-signed URL ke object storage (MinIO/S3).
3. Implementasikan inventory dasar: setiap tenant punya 1 Warehouse default (`isDefault=true`), stok dikelola per produk di warehouse tersebut.
4. Implementasikan endpoint penyesuaian stok manual (`/admin/inventory/adjust`) dengan validasi stok tidak boleh negatif.
5. Implementasikan endpoint publik storefront: list & detail produk (hanya status `ACTIVE`, dengan pagination & search sederhana).
6. Terapkan validasi lengkap sesuai `10-validation-rules.md` §10.3-10.4.
7. Unit test: pengurangan/penambahan stok atomic, validasi tidak boleh negatif, slug generation & uniqueness per tenant.
8. E2E test: create produk → upload gambar → publish (status ACTIVE) → muncul di endpoint storefront publik.

## Kriteria Selesai (Acceptance Criteria)
- [ ] CRUD produk & kategori berfungsi penuh dengan validasi sesuai spesifikasi.
- [ ] Produk dengan stok 0 otomatis tampil dengan status `OUT_OF_STOCK` di endpoint storefront (§3.3.4).
- [ ] Slug unik per tenant, auto-generate dari nama dengan opsi edit manual.
- [ ] Endpoint storefront publik tidak memerlukan auth dan hanya mengembalikan produk `ACTIVE` milik tenant yang di-resolve dari subdomain.
- [ ] Upload gambar produk berhasil tersimpan di object storage dan URL tersimpan di `ProductImage`.
- [ ] Test coverage ≥ 70%.

## Di Luar Scope
- Product variants (fitur opsional `product_variants` — task terpisah setelah core stabil).
- Multi-warehouse penuh (fitur opsional `multi_warehouse` — task terpisah, task ini hanya menyiapkan struktur data yang kompatibel).
- UI Admin Panel & Storefront (task frontend terpisah).
