# 01. Project Overview

## 1.1 Nama Proyek
**UMKM Commerce Platform (UCP)** — Platform e-commerce multi-tenant, modular, dan dapat dikonfigurasi (*configurable*), dirancang khusus untuk Usaha Mikro, Kecil, dan Menengah (UMKM) di Indonesia.

## 1.2 Latar Belakang & Masalah
Mayoritas UMKM membutuhkan toko online, tetapi:
- Solusi SaaS luar negeri (Shopify, dsb.) mahal, tidak fleksibel untuk konteks lokal (ongkir, metode pembayaran, pajak UMKM), dan sulit dikustomisasi.
- Solusi custom-build per UMKM mahal secara development dan maintenance, karena setiap UMKM punya kebutuhan berbeda (ada yang butuh multi-gudang, ada yang cukup jual satu produk saja).
- Kebutuhan fitur UMKM sangat bervariasi: warung kecil hanya butuh katalog + checkout WhatsApp, sementara UMKM yang lebih besar butuh multi-cabang, program loyalti, dan integrasi payment gateway.

## 1.3 Solusi
Membangun **satu basis kode (single codebase)** yang melayani banyak tenant (UMKM) sekaligus, dengan:
- **Fitur modular** yang dapat diaktifkan/nonaktifkan per tenant tanpa deploy ulang.
- **Fitur inti (core)** yang wajib ada di semua toko (katalog, checkout, order management).
- **Fitur opsional (add-on)** yang mengikuti kebutuhan dan paket langganan tiap UMKM (payment gateway online, multi-gudang, loyalty point, flash sale, POS, dsb).
- Arsitektur yang murah dioperasikan (shared infrastructure) namun tetap terisolasi secara data antar tenant.

## 1.4 Target Pengguna

| Role | Deskripsi |
|---|---|
| **Super Admin (Platform Owner)** | Mengelola seluruh tenant, paket langganan, fitur global, monitoring platform. |
| **Tenant Owner (Pemilik UMKM)** | Mendaftar, mengatur toko, mengaktifkan/nonaktifkan fitur, kelola produk & staff. |
| **Tenant Staff** | Admin toko, kasir, staff gudang — akses terbatas sesuai role (lihat `11-permissions.md`). |
| **Customer (Pembeli)** | Mengunjungi storefront tenant, belanja, checkout, tracking pesanan. |

## 1.5 Tujuan Produk (Goals)
1. UMKM dapat online dalam hitungan menit (self-service onboarding).
2. Biaya operasional platform rendah — 1 infrastruktur melayani ratusan/ribuan tenant.
3. Fitur dapat berkembang tanpa mengganggu tenant yang tidak memakainya (feature flag driven).
4. Setiap tenant merasa memiliki toko yang "dibuat khusus untuknya" meski berbagi basis kode yang sama.
5. Sistem cukup scalable untuk bertumbuh dari puluhan ke ribuan tenant.

## 1.6 Non-Goals (Di Luar Cakupan Awal)
- Bukan marketplace multi-vendor (customer belanja lintas toko dalam satu keranjang) — tiap tenant adalah toko independen dengan domain/subdomain sendiri.
- Bukan ERP/akuntansi penuh (integrasi ke sistem akuntansi eksternal dipertimbangkan di fase lanjut).
- Tidak menargetkan skala enterprise besar di fase awal (fokus UMKM mikro–menengah).

## 1.7 Model Bisnis (Ringkas)
Sistem paket langganan (subscription plan) yang menentukan fitur default aktif:

| Plan | Target | Contoh Fitur Aktif |
|---|---|---|
| **Basic** | Warung/toko rumahan | Katalog, checkout manual (transfer/COD), 1 admin |
| **Pro** | UMKM berkembang | + Payment gateway online, ongkir otomatis, multi-admin, promo/voucher |
| **Enterprise** | UMKM besar/multi-cabang | + Multi-gudang, POS, loyalty program, laporan lanjutan, integrasi marketplace |

Tenant Owner tetap bisa mengaktifkan fitur individual di luar default paketnya (opsional add-on berbayar — keputusan bisnis, di luar cakupan teknis dokumen ini).

## 1.8 Prinsip Desain Utama
1. **Feature-flag first** — setiap fitur non-inti harus bisa dimatikan tanpa merusak fitur lain.
2. **Tenant isolation by default** — semua query wajib ter-scope ke `tenant_id`, tidak ada celah kebocoran data antar tenant.
3. **Modular monolith di backend** — dimulai sebagai monolith modular (NestJS modules), bukan microservices, untuk kecepatan development; siap dipecah ke microservices di masa depan bila diperlukan.
4. **Convention over configuration** — konsistensi struktur kode agar mudah di-generate/dibantu AI coding assistant.
5. **Progressive complexity** — UMKM kecil tidak "terbebani" tampilan/kompleksitas fitur besar; UI/UX menyesuaikan fitur yang aktif.

## 1.9 Dokumen Terkait
Dokumen ini adalah bagian dari kumpulan dokumentasi teknis lengkap di folder `docs/`. Lihat khususnya:
- `03-business-rules.md` untuk detail logika feature flag & tenant.
- `04-database.md` untuk skema data.
- `15-ai-development-rules.md` untuk aturan kerja AI coding assistant di proyek ini.
