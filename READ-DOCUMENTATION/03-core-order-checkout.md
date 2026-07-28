# Task 03: Core — Order & Checkout (Pembayaran Manual)

## Status
- [ ] Belum dikerjakan

## Tipe
Core

## Konteks
Checkout dan order management adalah inti transaksi e-commerce. Task ini fokus pada alur dasar dengan pembayaran manual (transfer/COD) — payment gateway online adalah fitur opsional terpisah.

## Dokumen Referensi
- docs/03-business-rules.md (§3.4 Aturan Order & Checkout)
- docs/04-database.md (Customer, CustomerAddress, Order, OrderItem, OrderStatusHistory, Payment)
- docs/05-api-spec.md (Orders endpoints, storefront checkout)
- docs/10-validation-rules.md (§10.5)
- docs/12-workflows.md (§12.3 Checkout, §12.6 Expiry, §12.7 Konfirmasi Manual, §12.8 Fulfillment)

## Dependency
Task 02 (Core Catalog & Product)

## Scope Pekerjaan
1. Implementasikan modul `core/order`: model Customer & CustomerAddress, registrasi/login customer di storefront (tenant-scoped).
2. Implementasikan endpoint keranjang (`/storefront/cart`) — bisa berbasis session untuk guest.
3. Implementasikan endpoint checkout (`/storefront/checkout`) sesuai alur transaksi atomic di `12-workflows.md` §12.3 (tanpa bagian voucher/shipping otomatis — fitur opsional).
4. Implementasikan metode pembayaran manual (transfer bank/COD) dengan `paymentDueAt` dan instruksi pembayaran.
5. Implementasikan job BullMQ untuk auto-expire order manual yang lewat batas waktu (§12.6), termasuk rollback stok.
6. Implementasikan endpoint admin: list/detail order, update status manual, konfirmasi pembayaran manual (§12.7).
7. Implementasikan validasi transisi status order yang sah (tidak bisa lompat status, §12.8).
8. Unit test: perhitungan total order, atomic stock decrement saat checkout concurrent, validasi transisi status.
9. E2E test: alur penuh guest checkout → admin konfirmasi pembayaran → update status hingga COMPLETED.

## Kriteria Selesai (Acceptance Criteria)
- [ ] Checkout menghasilkan Order dengan snapshot harga & nama produk yang benar (§3.4.5).
- [ ] Concurrent checkout pada produk stok terbatas tidak menghasilkan overselling (diuji dengan simulasi request paralel).
- [ ] Order manual yang tidak dibayar melewati `paymentDueAt` otomatis menjadi `EXPIRED` dan stok dikembalikan.
- [ ] Tenant tidak bisa menonaktifkan seluruh metode pembayaran manual jika belum ada payment gateway aktif (§3.4.2).
- [ ] Semua perubahan status order tercatat di `OrderStatusHistory` dengan aktor yang jelas.
- [ ] Test coverage ≥ 70%.

## Di Luar Scope
- Integrasi payment gateway Midtrans/Xendit (task fitur opsional terpisah).
- Voucher/promosi di checkout (task fitur opsional terpisah, task ini menyiapkan struktur `Order.voucherId` namun logika penerapannya menyusul).
- Ongkir otomatis (task fitur opsional terpisah).
- UI Storefront & Admin Panel (task frontend terpisah).
