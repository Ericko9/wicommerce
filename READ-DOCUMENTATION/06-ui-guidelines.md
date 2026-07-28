# 06. UI Guidelines

## 6.1 Dua Aplikasi Frontend Berbeda Konteks

| Aplikasi | Karakter Desain | Prioritas |
|---|---|---|
| **Storefront** | Mengikuti tema/branding tiap tenant (warna, logo dinamis) | Kecepatan load (SSR/ISR), SEO, mobile-first — mayoritas trafik UMKM datang dari share link WhatsApp/Instagram di HP |
| **Admin Panel** | Konsisten, netral, fungsional (menggunakan shadcn/ui) | Efisiensi kerja, kejelasan data, kemudahan manajemen fitur |

## 6.2 Prinsip "Progressive Complexity"
UI Admin Panel **wajib** menyembunyikan menu/section yang berkaitan dengan fitur nonaktif:
- Jangan tampilkan menu "Multi Gudang" di sidebar jika fitur `multi_warehouse` tidak aktif untuk tenant tsb.
- Gunakan hook `useFeature('feature_key')` di frontend untuk conditional rendering (lihat `13-state-management.md`).
- Jangan hanya men-disable tombol — sembunyikan seluruhnya, agar UMKM kecil tidak merasa "toko saya kurang lengkap".

## 6.3 Design Tokens (Admin Panel)

```
Primary: #16A34A (hijau — asosiasi UMKM/pertumbuhan)
Secondary: #0F172A (slate gelap, untuk teks/navigasi)
Success: #22C55E
Warning: #F59E0B
Danger: #EF4444
Background: #F8FAFC
Surface (card): #FFFFFF
Border: #E2E8F0

Font: Inter (UI umum), font-mono untuk kode/SKU/ID
Radius: 8px (card/button), 6px (input)
Spacing scale: 4px base (Tailwind default)
```

Storefront **tidak** menggunakan token tetap — warna primer/tema mengikuti `TenantSetting.themeColor`, tapi tetap wajib mempertahankan kontras aksesibilitas (WCAG AA minimum, dicek otomatis saat tenant memilih warna kustom).

## 6.4 Komponen Admin Panel (shadcn/ui berbasis Radix + Tailwind)
Gunakan komponen dari shadcn/ui sebagai basis, jangan reinvent:
- `Table` dengan pagination bawaan untuk list produk/order.
- `Dialog`/`Sheet` untuk form create/edit agar konteks list tidak hilang.
- `Switch` khusus untuk toggle feature flag — dengan konfirmasi (`AlertDialog`) jika fitur yang dinonaktifkan memiliki dependency aktif (lihat `03-business-rules.md` §3.2.2).
- `Badge` untuk status order/produk dengan warna konsisten:
  - `PENDING_PAYMENT` → warning (kuning)
  - `PAID`/`COMPLETED` → success (hijau)
  - `CANCELLED`/`EXPIRED` → danger (merah)
  - `PROCESSING`/`SHIPPED` → info (biru)

## 6.5 Halaman Wajib — Admin Panel
1. Dashboard (ringkasan penjualan, order terbaru, stok menipis)
2. Manajemen Produk (list, create/edit, varian jika aktif)
3. Manajemen Kategori
4. Manajemen Order (list, detail, update status)
5. **Manajemen Fitur** (halaman khusus toggle semua fitur — lihat 6.6)
6. Manajemen Staff & Role
7. Pengaturan Toko (branding, payment, shipping)
8. Laporan (basic: total penjualan; advanced jika fitur aktif)

## 6.6 Halaman "Manajemen Fitur" (Kritis untuk Produk Ini)
Ini adalah halaman pembeda utama platform ini. Wajib memiliki:
- Daftar fitur dikelompokkan per kategori (`catalog`, `payment`, `shipping`, `marketing`, `operations`) — sesuai `Feature.category`.
- Tiap fitur menampilkan: nama, deskripsi singkat, toggle switch, badge "Termasuk paket Anda" / "Add-on" bila relevan secara bisnis.
- Fitur `isCore = true` ditampilkan tanpa toggle (selalu aktif, dengan label "Wajib").
- Saat toggle dimatikan dan ada fitur lain yang bergantung padanya dan sedang aktif, tampilkan konfirmasi yang menjelaskan dampaknya sebelum eksekusi.
- Perubahan langsung berefek (tidak perlu "Simpan" terpisah) namun tetap menampilkan toast konfirmasi sukses/gagal.

## 6.7 Storefront — Prinsip UX
1. **Mobile-first**, breakpoint utama di 375px–430px (mayoritas user HP Android kelas menengah).
2. Halaman produk harus render cepat (gunakan ISR/SSG untuk katalog, revalidate saat ada perubahan produk).
3. Checkout flow maksimal 3 langkah: Keranjang → Info Pengiriman & Pembayaran → Konfirmasi. Jangan buat multi-step form yang panjang untuk UMKM kecil.
4. Jika fitur `guest_checkout` aktif (default untuk plan basic), jangan paksa customer membuat akun untuk checkout.
5. Tampilkan status ketersediaan fitur secara implisit: jika `promotion_engine` nonaktif, jangan tampilkan kolom kode voucher sama sekali di checkout.

## 6.8 Aksesibilitas & Internasionalisasi (i18n-ready meski awal hanya Bahasa Indonesia)
- Semua teks UI melalui layer i18n (`next-intl` atau serupa) sejak awal meski hanya menyediakan locale `id`, agar mudah ekspansi bahasa nanti.
- Kontras warna minimal WCAG AA.
- Semua form wajib punya label eksplisit (bukan hanya placeholder) — penting untuk pengguna UMKM yang belum tentu familiar teknologi.
- Format mata uang selalu Rupiah dengan pemisah titik (`Rp150.000`), gunakan `Intl.NumberFormat('id-ID', ...)`.

## 6.9 Loading & Empty States
- Setiap halaman list wajib punya 3 state eksplisit: loading (skeleton), empty (ilustrasi + CTA relevan, mis. "Belum ada produk, tambah produk pertama Anda"), error (pesan jelas + tombol retry).
- Jangan pernah menampilkan halaman kosong tanpa penjelasan — UMKM sering menganggap itu sebagai "aplikasi rusak".

## 6.10 Konsistensi Ikon
Gunakan **lucide-react** di seluruh aplikasi (admin & storefront) untuk konsistensi visual dan bundle size yang efisien.
