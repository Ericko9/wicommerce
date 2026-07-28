# 11. Permissions (RBAC)

## 11.1 Level Akses Sistem
Ada 3 lapis identitas berbeda dalam sistem, **tidak boleh tercampur**:
1. **PlatformAdmin** — mengelola seluruh platform, lintas tenant.
2. **TenantUser** (Owner, Admin, Staff, Cashier) — bekerja dalam scope satu tenant.
3. **Customer** — pengguna storefront, scope satu tenant, hanya mengakses data miliknya sendiri.

## 11.2 Role Tenant Baku (Default, Tanpa Fitur `custom_roles`)

| Role | Deskripsi |
|---|---|
| `OWNER` | Pemilik UMKM. Akses penuh ke semua fitur aktif tenant, termasuk toggle fitur, kelola staff, kelola pembayaran/keuangan. |
| `ADMIN` | Pengelola harian toko. Akses hampir penuh kecuali: toggle fitur, kelola staff dengan role `OWNER`, hapus tenant. |
| `STAFF` | Operasional (input produk, proses order). Tidak bisa akses laporan keuangan sensitif maupun pengaturan toko. |
| `CASHIER` | Khusus modul POS (jika aktif). Hanya bisa membuat transaksi penjualan & lihat order, tidak bisa ubah produk/harga. |

## 11.3 Matriks Permission

Legenda: ✅ Boleh · ❌ Tidak Boleh · 🔶 Terbatas (lihat catatan)

| Aksi | OWNER | ADMIN | STAFF | CASHIER |
|---|---|---|---|---|
| Lihat dashboard | ✅ | ✅ | ✅ | 🔶 (versi ringkas) |
| Toggle fitur (Feature Flag) | ✅ | ❌ | ❌ | ❌ |
| Kelola paket langganan/plan | ✅ | ❌ | ❌ | ❌ |
| Tambah/edit produk | ✅ | ✅ | ✅ | ❌ |
| Hapus produk | ✅ | ✅ | ❌ | ❌ |
| Ubah harga produk | ✅ | ✅ | ❌ | ❌ |
| Kelola kategori | ✅ | ✅ | 🔶 (tambah saja, tidak hapus) | ❌ |
| Lihat order | ✅ | ✅ | ✅ | ✅ |
| Ubah status order | ✅ | ✅ | ✅ | 🔶 (hanya order POS miliknya) |
| Konfirmasi pembayaran manual | ✅ | ✅ | ❌ | ❌ |
| Refund order | ✅ | ✅ | ❌ | ❌ |
| Kelola voucher/flash sale | ✅ | ✅ | ❌ | ❌ |
| Kelola gudang & stok | ✅ | ✅ | 🔶 (adjust stok saja, bukan buat gudang baru) | ❌ |
| Kelola staff (tambah/hapus/ubah role) | ✅ | 🔶 (tidak bisa kelola OWNER) | ❌ | ❌ |
| Pengaturan toko (branding, payment config) | ✅ | 🔶 (tidak bisa ubah kredensial payment gateway) | ❌ | ❌ |
| Lihat laporan penjualan basic | ✅ | ✅ | ✅ | ❌ |
| Lihat laporan keuangan lanjutan | ✅ | ✅ | ❌ | ❌ |
| Transaksi POS (jika aktif) | ✅ | ✅ | 🔶 (jika diberi izin eksplisit) | ✅ |
| Hapus/tutup tenant | ✅ | ❌ | ❌ | ❌ |

## 11.4 Permission Platform Admin
`PlatformAdmin` memiliki akses penuh lintas tenant untuk keperluan operasional platform:
- Lihat & kelola semua tenant (status, plan).
- Kelola daftar `Feature` global dan `Plan` beserta entitlement-nya.
- **Tidak dapat** mengakses/mengubah data operasional tenant (produk, order, customer) secara langsung tanpa jejak audit eksplisit (`impersonation` bila diperlukan untuk support, wajib dicatat di `AuditLog` dengan flag khusus `via_impersonation: true`).

## 11.5 Permission Customer
Customer hanya dapat:
- Melihat & mengedit profil miliknya sendiri.
- Melihat riwayat order miliknya sendiri (tidak bisa lihat order customer lain, bahkan di tenant yang sama).
- Checkout, apply voucher publik, melihat saldo poin loyalty miliknya.

## 11.6 Implementasi Teknis
1. **Guard Backend**: `RolesGuard` membaca decorator `@Roles('OWNER', 'ADMIN')` di controller/route dan membandingkan dengan `role` di JWT payload TenantUser.
2. **Guard Frontend**: hook `usePermission('action_key')` di admin panel menyembunyikan/disable elemen UI sesuai role — **namun ini hanya UX**, keamanan sesungguhnya tetap di backend (defense in depth, jangan pernah hanya mengandalkan hidden UI di frontend).
3. Kombinasi Guard: route yang butuh role tertentu **dan** fitur aktif menggunakan urutan guard: `JwtAuthGuard → FeatureFlagGuard → RolesGuard` (autentikasi dulu, baru cek fitur aktif, baru cek role — urutan ini meminimalkan informasi yang bocor ke user tidak berwenang).
4. JWT payload TenantUser menyertakan: `sub` (userId), `tenantId`, `role`, `email` — **tidak** menyertakan data sensitif lain.

## 11.7 Fitur Opsional: Custom Roles (`custom_roles`)
Jika tenant mengaktifkan fitur ini (biasanya plan Enterprise):
- Owner dapat membuat role kustom dengan kombinasi permission granular (model `TenantRolePermission` — di luar skema inti, ditambahkan sebagai extension saat fitur ini dikembangkan).
- Role baku (`OWNER`, `ADMIN`, `STAFF`, `CASHIER`) tetap ada sebagai default/template, tidak bisa dihapus.
- Detail skema tambahan untuk fitur ini didokumentasikan terpisah saat modul `custom-roles` dikembangkan (lihat task terkait di `tasks/`).

## 11.8 Prinsip Least Privilege
- Default role staff baru yang dibuat Owner: `STAFF` (bukan `ADMIN`) — Owner harus secara eksplisit menaikkan privilege.
- Token JWT access berumur pendek (15 menit) untuk membatasi dampak jika token bocor; refresh token 7 hari, disimpan sebagai httpOnly cookie (bukan localStorage) untuk mitigasi XSS.
