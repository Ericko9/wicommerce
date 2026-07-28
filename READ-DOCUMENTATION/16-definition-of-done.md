# 16. Definition of Done

Sebuah task/fitur dianggap **selesai** hanya jika seluruh checklist berikut terpenuhi. Checklist ini wajib dipakai baik oleh developer manusia maupun AI coding assistant sebelum menandai task sebagai selesai atau membuka Pull Request untuk review.

## 16.1 Checklist Umum (Semua Task)
- [ ] Kode mengikuti `08-coding-standards.md` (lint & type-check lolos tanpa error, tanpa `any` yang tidak dijustifikasi).
- [ ] Tidak ada `console.log`/`debugger` tertinggal di kode production.
- [ ] File ditempatkan sesuai `07-folder-structure.md`.
- [ ] Penamaan (variabel, file, endpoint, feature key) sesuai `08-coding-standards.md` §8.4 dan `09-project-conventions.md`.
- [ ] Commit message mengikuti Conventional Commits (`09-project-conventions.md` §9.2).
- [ ] Tidak ada credential/API key hardcoded di kode.

## 16.2 Checklist — Perubahan Database
- [ ] Migration dibuat via `prisma migrate dev` dengan nama deskriptif.
- [ ] Skema baru mengikuti prinsip di `04-database.md` (tenantId + index untuk model tenant-scoped, cuid untuk PK).
- [ ] Seed data diperbarui jika relevan (Feature/Plan baru).
- [ ] Migration sudah diuji di database development tanpa error, termasuk terhadap data existing (jika ada data lama yang relevan).
- [ ] `04-database.md` diperbarui mencerminkan skema terbaru.

## 16.3 Checklist — Endpoint API Baru/Diubah
- [ ] DTO dengan validasi lengkap (`class-validator`) sesuai `10-validation-rules.md`.
- [ ] Guard yang sesuai terpasang: `JwtAuthGuard`, `RolesGuard` (`11-permissions.md`), dan `FeatureFlagGuard` + `@RequireFeature()` jika fitur non-core.
- [ ] Response mengikuti format envelope standar (`05-api-spec.md` §5.2).
- [ ] Error handling menghasilkan kode error yang sesuai daftar standar (`05-api-spec.md` §5.2).
- [ ] Endpoint terdaftar di Swagger dengan deskripsi jelas.
- [ ] `05-api-spec.md` diperbarui dengan endpoint baru/berubah.
- [ ] Test e2e (Supertest) minimal untuk happy path dan satu skenario error/unauthorized.

## 16.4 Checklist — Fitur Baru (Feature-Flagged)
- [ ] Entry `Feature` ditambahkan (key, name, category, isCore=false) di seed.
- [ ] Dependency antar fitur (jika ada) divalidasi di service layer sesuai `03-business-rules.md` §3.2.2.
- [ ] Controller terkait menggunakan `@RequireFeature('key')`.
- [ ] Frontend (admin dan/atau storefront) menggunakan `useFeature('key')` untuk menyembunyikan UI terkait saat nonaktif.
- [ ] Halaman "Manajemen Fitur" otomatis menampilkan fitur baru ini tanpa perubahan kode tambahan (karena data-driven dari tabel `Feature`).
- [ ] `03-business-rules.md` diperbarui dengan aturan bisnis fitur ini.
- [ ] Diuji secara manual/otomatis: perilaku sistem benar baik saat fitur ON maupun OFF.

## 16.5 Checklist — Perubahan UI/Frontend
- [ ] Mengikuti `06-ui-guidelines.md` (komponen, warna, spacing konsisten).
- [ ] 3 state wajib tersedia untuk halaman list: loading, empty, error (§6.9).
- [ ] Responsif di breakpoint mobile utama (375–430px) untuk storefront.
- [ ] Data fetching melalui hook TanStack Query sesuai `13-state-management.md`, tidak ada fetch langsung di komponen.
- [ ] Teks UI melalui layer i18n (tidak hardcode string di komponen), sesuai `06-ui-guidelines.md` §6.8.
- [ ] Aksesibilitas dasar terpenuhi (label form eksplisit, kontras warna cukup).

## 16.6 Checklist — Keamanan
- [ ] Query database untuk model tenant-scoped memfilter `tenantId` secara eksplisit.
- [ ] Input divalidasi & disanitasi sesuai `10-validation-rules.md`.
- [ ] Data sensitif (API key tenant, dsb) dienkripsi sesuai `14-non-functional.md` §14.3.3.
- [ ] Tidak ada endpoint yang membocorkan data tenant lain (diuji dengan skenario IDOR sederhana: coba akses resource tenant lain dengan token tenant ini, harus `404`, bukan `403` — untuk tidak membocorkan keberadaan resource).
- [ ] Webhook baru (jika ada) memverifikasi signature sebelum memproses payload.

## 16.7 Checklist — Testing
- [ ] Unit test untuk business logic non-trivial (kalkulasi, validasi, perubahan state) sesuai `08-coding-standards.md` §8.8.
- [ ] Test mencakup skenario feature ON dan feature OFF (untuk fitur opsional).
- [ ] Semua test yang sudah ada tetap lolos (tidak ada regresi).
- [ ] Coverage minimum sesuai target modul (`core` 70%, `modules` opsional 50%) tidak menurun akibat perubahan ini.

## 16.8 Checklist — Dokumentasi
- [ ] Dokumen relevan di `docs/` diperbarui sesuai perubahan (skema, API, business rules, UI pattern baru) — lihat mapping di `15-ai-development-rules.md` §15.1.
- [ ] Jika ada keputusan desain baru yang belum tercakup dokumen manapun, tambahkan ke dokumen yang paling relevan atau catat sebagai catatan di PR untuk didiskusikan.
- [ ] `CHANGELOG.md` diperbarui jika perubahan termasuk kategori yang perlu dicatat (fitur baru, breaking change, deprecation).

## 16.9 Checklist — Sebelum Merge ke `main`
- [ ] CI (lint, type-check, test, build) hijau semua.
- [ ] PR sudah diisi lengkap sesuai template (`09-project-conventions.md` §9.3).
- [ ] Minimal 1 approval reviewer (kecuali kategori self-mergeable sesuai §9.3).
- [ ] Tidak ada konflik merge dengan `main` terbaru.
- [ ] Jika ada migration database, sudah dikoordinasikan waktu deploy-nya (migration besar sebaiknya di luar jam sibuk).

## 16.10 Definisi "Selesai" untuk Task oleh AI Coding Assistant
Selain seluruh checklist di atas yang relevan dengan task, AI wajib menyertakan ringkasan akhir yang menyatakan secara eksplisit:
1. Dokumen mana saja di `docs/` yang diperbarui sebagai bagian dari task ini.
2. Apakah task ini memperkenalkan feature flag baru (dan key-nya).
3. Apakah ada asumsi yang diambil karena instruksi ambigu (lihat `15-ai-development-rules.md` §15.5).
4. Test apa saja yang ditambahkan/diperbarui.

Task **tidak dianggap selesai** hanya karena kode "berjalan" — harus memenuhi checklist di atas secara terverifikasi.
