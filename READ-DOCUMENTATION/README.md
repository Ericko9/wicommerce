# Tasks — Panduan Format

Folder ini berisi breakdown pekerjaan konkret yang siap dikerjakan (oleh developer manusia maupun AI coding assistant) secara bertahap, task demi task.

## Konvensi Penamaan File
```
tasks/
├── README.md                      (dokumen ini)
├── 00-setup-monorepo.md
├── 01-core-auth-tenant.md
├── 02-core-catalog-product.md
├── 03-core-order-checkout.md
├── 04-feature-payment-gateway.md
├── 05-feature-multi-warehouse.md
├── 06-feature-promotion-voucher.md
├── 07-feature-loyalty-points.md
├── 08-admin-panel-feature-management.md
├── 09-storefront-mvp.md
└── ...
```
Penomoran mengikuti urutan pengerjaan yang disarankan (dependency logis), bukan prioritas mutlak — dapat disesuaikan dengan kebutuhan bisnis.

## Format Isi Setiap File Task

Setiap file task **wajib** mengikuti struktur berikut agar konsisten dan mudah dieksekusi AI coding assistant:

```markdown
# Task XX: <Judul Singkat>

## Status
- [ ] Belum dikerjakan / Sedang dikerjakan / Selesai

## Tipe
Core | Feature Opsional | Infrastruktur | Dokumentasi

## Konteks
<1-3 kalimat menjelaskan mengapa task ini perlu, merujuk ke dokumen terkait>

## Dokumen Referensi
- docs/xx-....md (bagian mana yang relevan)

## Dependency
<Task lain yang harus selesai lebih dulu, atau "Tidak ada">

## Feature Flag (jika Tipe = Feature Opsional)
- Key: `feature_key_name`
- Category: catalog | payment | shipping | marketing | operations
- Dependency ke fitur lain: <sebutkan atau "Tidak ada">

## Scope Pekerjaan
1. <langkah 1>
2. <langkah 2>
3. ...

## Kriteria Selesai (Acceptance Criteria)
- [ ] <kriteria spesifik dan terukur>
- [ ] <kriteria spesifik dan terukur>

## Di Luar Scope
<Hal yang sengaja tidak dikerjakan di task ini agar tidak melebar>
```

## Prinsip Pemecahan Task
1. **Satu task = satu unit kerja yang bisa di-review dalam satu PR.** Jangan gabungkan pembuatan skema database + UI lengkap + integrasi pihak ketiga dalam satu task besar.
2. Task **Core** selalu dikerjakan lebih dulu sebelum task **Feature Opsional** yang bergantung padanya.
3. Setiap task **Feature Opsional** wajib eksplisit menyebutkan feature flag key yang akan dibuat (lihat `09-project-conventions.md` §9.4 untuk konvensi penamaan).
4. Task yang scope-nya lebih dari ~3-4 hari kerja manusia (atau setara beberapa jam sesi AI) sebaiknya dipecah lebih kecil lagi.

## Cara AI Menggunakan Folder Ini
Sesuai `15-ai-development-rules.md` §15.8, AI coding assistant mengerjakan proyek ini berdasarkan file task yang diberikan di folder ini satu per satu, memperbarui status task, dan boleh menambahkan task turunan baru (dengan mengikuti format yang sama) jika task besar perlu dipecah lebih lanjut saat dikerjakan.
