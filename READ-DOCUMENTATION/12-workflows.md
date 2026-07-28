# 12. Workflows

## 12.1 Workflow: Onboarding Tenant Baru
```
1. Calon Owner mengisi form registrasi (storeName, subdomain, email, password)
2. Sistem validasi subdomain unik & tidak reserved
3. Sistem membuat:
   a. Tenant (status = PENDING)
   b. TenantUser (role = OWNER)
   c. TenantSetting default
   d. Warehouse default (isDefault = true)
   e. TenantFeature untuk semua Feature isCore=true (isEnabled=true)
   f. TenantFeature sesuai entitlement Plan yang dipilih (default: "basic")
4. Kirim email verifikasi ke Owner
5. Owner verifikasi email -> Tenant status jadi ACTIVE
6. Owner diarahkan ke onboarding wizard singkat (isi profil toko, tambah produk pertama)
```
Audit: setiap langkah 3a-3f dicatat sebagai satu entry `AuditLog` (`action: TENANT_CREATED`).

## 12.2 Workflow: Toggle Feature Flag
```
1. Owner buka halaman "Manajemen Fitur" di Admin Panel
2. Owner klik toggle pada satu fitur (mis. "Multi Gudang")
3. Frontend kirim PATCH /admin/features/multi_warehouse/toggle { isEnabled: false }
4. Backend:
   a. Cek role requester = OWNER
   b. Cek feature.isCore == false (jika core, tolak)
   c. Jika isEnabled=false: cek apakah ada fitur lain yang isEnabled=true
      dan memiliki dependency ke fitur ini
      -> jika ada dan request tidak menyertakan cascadeDisable=true,
         return 409 FEATURE_HAS_ACTIVE_DEPENDENTS dengan daftar fitur terdampak
   d. Jika lolos, update TenantFeature.isEnabled
   e. Invalidate cache Redis "feature:{tenantId}:{key}"
   f. Catat AuditLog (action: FEATURE_TOGGLE, before/after)
5. Frontend refresh state fitur (invalidate query cache "features")
   -> sidebar & UI menyesuaikan otomatis
```

## 12.3 Workflow: Checkout & Pembuatan Order (Storefront)
```
1. Customer di halaman checkout, submit form (alamat, metode pembayaran, voucher opsional)
2. Backend menerima POST /storefront/checkout (dengan Idempotency-Key header)
3. Dalam satu DATABASE TRANSACTION:
   a. Re-validasi setiap item keranjang: produk masih ACTIVE, stok cukup
      (lock row inventory untuk mencegah race condition)
   b. Hitung ulang subtotal dari harga produk SAAT INI (bukan dari cache client)
   c. Jika voucherCode ada: validasi & hitung diskon (lihat 12.4)
   d. Jika fitur auto_shipping aktif: ambil shippingCost dari hasil kalkulasi
      sebelumnya (disimpan sementara di session/cart), re-validasi masih relevan
   e. Hitung totalAmount = subtotal - discountTotal + shippingCost
   f. Buat Order (status = PENDING_PAYMENT) + OrderItem (dengan price/name snapshot)
   g. Kurangi stok InventoryItem sesuai item & warehouse
   h. Jika voucher dipakai: increment Voucher.usedCount
   i. Buat OrderStatusHistory (null -> PENDING_PAYMENT)
4. COMMIT transaction
5. Jika paymentMethod = payment gateway (Midtrans/Xendit):
   -> panggil API gateway, dapatkan payment URL/token, kembalikan ke frontend
   Jika paymentMethod = manual:
   -> set Order.paymentDueAt = now() + TenantSetting.paymentDueHours
   -> kirim notifikasi instruksi transfer (WA/Email)
6. Enqueue job BullMQ "order-expiry-check" terjadwal di paymentDueAt (khusus manual)
```

## 12.4 Workflow: Validasi & Penerapan Voucher
```
1. Customer masukkan kode voucher saat checkout (fitur promotion_engine harus aktif)
2. Backend cek:
   a. Voucher exists untuk tenant ini & code cocok (case-insensitive tapi disimpan uppercase)
   b. now() berada dalam rentang [startAt, endAt]
   c. usedCount < usageLimit (jika usageLimit diset)
   d. Hitung berapa kali customer ini sudah pakai voucher ini,
      bandingkan dengan usageLimitPerCustomer
   e. Hitung discountAmount:
      - PERCENTAGE: subtotal * (value / 100)
      - FIXED: min(value, subtotal)  // tidak boleh membuat total negatif
3. Jika semua valid, return discountAmount ke frontend untuk preview sebelum submit final checkout
4. Penerapan final (increment usedCount) HANYA terjadi saat checkout benar-benar submit
   (bukan saat preview), untuk menghindari usedCount naik oleh percobaan yang tidak jadi checkout
```

## 12.5 Workflow: Pembayaran via Payment Gateway (Webhook)
```
1. Payment gateway (Midtrans/Xendit) mengirim POST webhook ke
   /storefront/payment/webhook/{provider}
2. Backend:
   a. Verifikasi signature/token sesuai dokumentasi provider (WAJIB, tolak jika invalid)
   b. Cari Order via externalRef/orderId yang dikirim provider
   c. Cek idempotency: jika Payment.status sudah SUCCESS, abaikan (return 200 tanpa proses ulang)
   d. Update Payment.status, Payment.paidAt, Payment.rawPayload
   e. Jika status = SUCCESS: update Order.status PENDING_PAYMENT -> PAID
      + catat OrderStatusHistory (actorId: null, note: "via webhook")
      + enqueue job notifikasi ke customer & tenant admin
   f. Jika status = FAILED/EXPIRED: update Order.status -> CANCELLED/EXPIRED sesuai kasus
3. Return 200 OK ke provider (wajib cepat, idealnya <2 detik — proses berat dilempar ke job queue)
```

## 12.6 Workflow: Expiry Order Pembayaran Manual (Scheduled Job)
```
1. Job "order-expiry-check" (BullMQ, cron tiap 15 menit atau di-trigger per-order via delayed job)
2. Query Order dengan status=PENDING_PAYMENT, paymentMethod=manual, paymentDueAt < now()
3. Untuk tiap order:
   a. Update status -> EXPIRED
   b. Kembalikan stok (increment InventoryItem sesuai OrderItem)
   c. Jika voucher dipakai, decrement Voucher.usedCount (rollback pemakaian)
   d. Catat OrderStatusHistory (actorId: null, note: "auto-expired")
   e. Kirim notifikasi ke customer
```

## 12.7 Workflow: Konfirmasi Pembayaran Manual oleh Admin
```
1. Admin/Owner lihat daftar order PENDING_PAYMENT dengan paymentMethod=manual
2. Admin verifikasi bukti transfer (di luar sistem atau upload bukti oleh customer, jika fitur aktif)
3. Admin klik "Konfirmasi Pembayaran" -> POST /admin/orders/:id/confirm-payment
4. Backend: update Order.status PENDING_PAYMENT -> PAID,
   catat OrderStatusHistory (actorId: admin.id)
5. Lanjut ke workflow fulfillment normal (12.8)
```

## 12.8 Workflow: Fulfillment Order (Setelah PAID)
```
PAID -> (Admin update) -> PROCESSING -> (Admin input resi, jika ada)
      -> SHIPPED -> (Admin/System, atau auto via webhook ekspedisi jika terintegrasi)
      -> COMPLETED
```
- Setiap perpindahan status manual oleh Admin/Staff via `PATCH /admin/orders/:id/status`, divalidasi transisi status yang sah (tidak bisa lompat dari `PAID` langsung ke `COMPLETED` tanpa `SHIPPED`, kecuali produk digital — pengecualian dikonfigurasi per tenant jika relevan).
- Saat status jadi `COMPLETED`: jika fitur `loyalty_points` aktif, trigger job pemberian poin loyalty ke customer (lihat business rule §3.7).

## 12.9 Workflow: Perhitungan & Penukaran Poin Loyalty
```
Pemberian poin (saat Order -> COMPLETED):
1. Job "award-loyalty-points" dijalankan
2. points = floor(order.totalAmount / TenantSetting.loyaltyPointRatio)
3. Increment Customer.loyaltyPoints += points
4. Catat riwayat (tabel LoyaltyPointHistory - lihat catatan skema tambahan di 04-database.md
   saat modul ini dikembangkan penuh)

Penukaran poin (saat checkout, opsional):
1. Customer pilih "gunakan X poin" saat checkout
2. Backend validasi X <= Customer.loyaltyPoints saat ini
3. Nilai potongan = X * (nilai rupiah per poin, kebalikan dari loyaltyPointRatio, dikonfigurasi terpisah jika rasio redeem berbeda dari rasio earn)
4. Decrement Customer.loyaltyPoints di transaction yang sama dengan pembuatan Order
```

## 12.10 Workflow: Upgrade/Downgrade Plan Tenant
```
1. Owner (atau Platform Admin atas nama Owner) memilih plan baru
2. Backend ambil daftar Feature entitlement plan baru (via PlanFeature)
3. Untuk setiap Feature core: pastikan tetap aktif (tidak berubah)
4. Untuk setiap Feature non-core:
   a. Jika ada di entitlement plan baru dan sebelumnya nonaktif karena tidak masuk plan lama
      -> TIDAK otomatis diaktifkan (tetap mengikuti pilihan Owner), hanya status
      "tersedia untuk diaktifkan" yang berubah
   b. Jika TIDAK ada di entitlement plan baru (downgrade) dan sedang aktif
      -> nonaktifkan otomatis + catat AuditLog + kirim notifikasi ke Owner
      menjelaskan fitur mana yang dinonaktifkan akibat downgrade
5. Update Tenant.planId
```

## 12.11 Diagram Status Order (Ringkas)
```
PENDING_PAYMENT --(bayar sukses)--> PAID --> PROCESSING --> SHIPPED --> COMPLETED
       |                              |
       |--(expired/dibatalkan)--> EXPIRED / CANCELLED
                                       |
                                (jika refund aktif)
                                       v
                                   REFUNDED
```
