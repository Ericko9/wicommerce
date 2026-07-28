# 09. Project Conventions

## 9.1 Git Branching Strategy
Menggunakan **trunk-based lite** (cocok untuk tim kecil + AI-assisted development):

```
main            → selalu deployable, protected branch
├── feat/<scope>-<deskripsi-singkat>     contoh: feat/api-multi-warehouse
├── fix/<scope>-<deskripsi-singkat>      contoh: fix/storefront-cart-total
├── chore/<deskripsi>                    contoh: chore/upgrade-nestjs
└── docs/<deskripsi>                     contoh: docs/update-api-spec
```
- Tidak ada branch `develop` terpisah untuk menjaga kesederhanaan; gunakan feature flag (bukan long-lived branch) untuk fitur yang belum siap rilis penuh.
- Setiap branch wajib berasal dari `main` terbaru dan di-merge kembali via Pull Request — tidak ada push langsung ke `main`.

## 9.2 Commit Convention — Conventional Commits
Format:
```
<type>(<scope>): <deskripsi singkat imperatif>

[body opsional]
[footer opsional, mis. BREAKING CHANGE: ...]
```

| Type | Kapan Dipakai |
|---|---|
| `feat` | Fitur/kapabilitas baru |
| `fix` | Perbaikan bug |
| `refactor` | Perubahan struktur kode tanpa mengubah perilaku |
| `docs` | Perubahan dokumentasi saja |
| `test` | Menambah/memperbaiki test |
| `chore` | Maintenance, dependency, config |
| `perf` | Perbaikan performa |
| `style` | Formatting, tidak mengubah logika |

Contoh:
```
feat(api-warehouse): tambah endpoint penyesuaian stok manual
fix(storefront-checkout): perbaiki perhitungan ongkir saat voucher aktif
docs(database): update skema Voucher dengan usageLimitPerCustomer
```

Scope mengikuti pola `<app>-<modul>` (contoh: `api-payment`, `admin-features`, `storefront-cart`) agar mudah dilacak lintas monorepo.

Divalidasi otomatis via **Commitlint** di git hook `commit-msg` (Husky).

## 9.3 Pull Request Convention
Template PR wajib mencakup:
```markdown
## Ringkasan
<Apa yang diubah dan mengapa>

## Terkait Dokumen
<Rujukan ke docs/xx-*.md yang relevan, mis. "Implementasi sesuai 03-business-rules.md §3.4">

## Perubahan Skema Database?
- [ ] Ya (lampirkan migration)
- [ ] Tidak

## Fitur Baru — Sudah Feature-Flagged?
- [ ] Ya, key: `___________`
- [ ] N/A (bukan fitur opsional/core)

## Checklist
- [ ] Lint & type-check lolos
- [ ] Test terkait ditambahkan/diupdate
- [ ] Sudah dicek terhadap 16-definition-of-done.md
```
Minimal 1 approval sebelum merge (self-merge diperbolehkan hanya untuk `docs/` dan `chore/` non-kritis).

## 9.4 Konvensi Penamaan Feature Flag Key
- Format: `snake_case`, deskriptif, tidak disingkat berlebihan.
- Prefix kategori opsional untuk kejelasan: `payment_midtrans`, `payment_xendit`, `shipping_auto_rate`, `report_advanced`.
- Sekali key dipublikasikan (dipakai production), **tidak boleh diubah namanya** — jika perlu deprecated, buat key baru dan tandai lama sebagai `deprecated` di metadata, jangan rename langsung (breaking untuk data existing).

## 9.5 Konvensi Environment Variables
Semua env variable didaftarkan di `.env.example` dengan komentar, divalidasi saat boot aplikasi (Zod schema di `apps/api/src/config`). Prefix per konteks:
```
DATABASE_URL=
REDIS_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=

MIDTRANS_SERVER_KEY=      # digunakan sbg default/sandbox; tenant bisa override via TenantFeature.config
XENDIT_SECRET_KEY=

NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_STOREFRONT_BASE_DOMAIN=ucp.id
```
**Dilarang** commit `.env` asli ke repo — hanya `.env.example`.

## 9.6 Konvensi Versi API
- Breaking change pada kontrak API wajib menaikkan versi path (`/api/v2/...`), versi lama tetap didukung minimal 3 bulan (deprecation window) sebelum dimatikan, diumumkan via header `Deprecation` dan `Sunset`.
- Non-breaking (menambah field opsional baru) tidak perlu versi baru.

## 9.7 Konvensi Bahasa
- **Kode** (nama variabel, fungsi, komentar teknis): Bahasa Inggris — standar industri, memudahkan AI coding assistant & tooling.
- **Dokumentasi produk/bisnis** (`docs/*.md`): Bahasa Indonesia — audiens utama tim & stakeholder lokal.
- **UI-facing text** (label, pesan error ke user): Bahasa Indonesia, melalui layer i18n (lihat `06-ui-guidelines.md` §6.8).
- **Pesan error/log teknis** (untuk developer/debugging): Bahasa Inggris.

## 9.8 Definisi "Modul" vs "Fitur"
Untuk konsistensi terminologi di seluruh dokumentasi dan kode:
- **Modul** = unit kode NestJS (`*.module.ts`) — konsep teknis/struktural.
- **Fitur (Feature)** = unit fungsional yang tercatat di tabel `Feature` dan dapat di-toggle — konsep bisnis/produk.
- Umumnya 1 Modul merepresentasikan 1 Fitur, tapi tidak selalu 1:1 (satu modul `payment-gateway` bisa membawahi 2 fitur: `payment_midtrans` dan `payment_xendit`, masing-masing di-toggle independen).

## 9.9 Changelog
`CHANGELOG.md` di root, mengikuti format [Keep a Changelog](https://keepachangelog.com/), digenerate/diupdate manual per rilis minor/major (bukan tiap commit), dikelompokkan: `Added`, `Changed`, `Fixed`, `Deprecated`.
