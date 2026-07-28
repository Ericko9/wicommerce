# Task 04: Fitur Opsional — Payment Gateway (Midtrans & Xendit)

## Status
- [ ] Belum dikerjakan

## Tipe
Feature Opsional

## Konteks
Payment gateway online adalah fitur bernilai tinggi untuk UMKM plan Pro/Enterprise, memungkinkan pembayaran otomatis terverifikasi tanpa konfirmasi manual admin.

## Dokumen Referensi
- docs/03-business-rules.md (§3.4.2)
- docs/04-database.md (Payment)
- docs/05-api-spec.md (webhook endpoints)
- docs/12-workflows.md (§12.5 Webhook Pembayaran)
- docs/14-non-functional.md (§14.3.5 Webhook Security)

## Dependency
Task 03 (Core Order & Checkout)

## Feature Flag
- Key: `payment_midtrans`, `payment_xendit` (dua fitur independen, satu modul `payment-gateway`)
- Category: `payment`
- Dependency ke fitur lain: Tidak ada (independen dari `promotion_engine`/lainnya)

## Scope Pekerjaan
1. Implementasikan modul `modules/payment-gateway/midtrans` dan `modules/payment-gateway/xendit` sesuai struktur `07-folder-structure.md`.
2. Endpoint checkout diperluas: jika `paymentMethod` mengarah ke gateway aktif, panggil API gateway terkait, kembalikan payment URL/token ke client.
3. Implementasikan endpoint webhook (`/storefront/payment/webhook/midtrans`, `/storefront/payment/webhook/xendit`) dengan verifikasi signature wajib.
4. Implementasikan idempotency handling pada webhook (§12.5 langkah c).
5. Simpan kredensial tenant (`merchantId`, `serverKey`, dsb) di `TenantFeature.config`, terenkripsi sesuai `14-non-functional.md` §14.3.3.
6. Validasi skema `config` per fitur menggunakan Zod di backend saat tenant mengisi kredensial (§10.6).
7. Update validasi `paymentMethod` di checkout agar mengecek fitur gateway benar-benar aktif untuk tenant tsb sebelum memprosesnya (§10.5).
8. Unit test: verifikasi signature gagal ditolak, webhook idempotent (dipanggil 2x tidak mengubah status 2x), enkripsi/dekripsi config kredensial.
9. E2E test (dengan mock API gateway): checkout via Midtrans → simulasi webhook sukses → Order menjadi PAID.

## Kriteria Selesai (Acceptance Criteria)
- [ ] Toggle fitur `payment_midtrans`/`payment_xendit` di Admin Panel langsung mempengaruhi metode pembayaran yang tersedia di storefront tenant tsb.
- [ ] Webhook dengan signature tidak valid ditolak (tidak memproses payload).
- [ ] Webhook yang dipanggil berkali-kali untuk event yang sama tidak menghasilkan efek ganda pada Order.
- [ ] Kredensial tenant tersimpan terenkripsi di database, tidak plaintext.
- [ ] Fitur ini bisa dinonaktifkan tanpa error di sistem lain (checkout otomatis fallback ke metode manual yang tersedia).
- [ ] Test coverage ≥ 50% (sesuai target modul opsional).

## Di Luar Scope
- UI form pengaturan kredensial di Admin Panel (dapat menjadi task frontend terpisah, namun endpoint backend untuk save config termasuk dalam scope task ini).
- Payment gateway selain Midtrans/Xendit (task terpisah jika dibutuhkan di kemudian hari).
