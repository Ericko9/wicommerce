# 15. AI Development Rules

Dokumen ini adalah instruksi khusus untuk **AI coding assistant** (mis. Claude Code) yang mengerjakan implementasi proyek ini. Tujuannya memastikan output AI konsisten dengan seluruh dokumen di `docs/` tanpa perlu dokumen ini dibaca ulang manual oleh manusia setiap saat.

## 15.1 Urutan Membaca Dokumen (Wajib Sebelum Mulai Coding)
Sebelum mengerjakan task apapun, AI **wajib** memeriksa dokumen berikut sesuai relevansi task:
1. `01-project-overview.md` & `03-business-rules.md` — memahami konteks bisnis fitur yang dikerjakan.
2. `04-database.md` — jika task menyentuh data/skema.
3. `05-api-spec.md` — jika task membuat/mengubah endpoint.
4. `07-folder-structure.md` & `08-coding-standards.md` — SELALU, untuk penempatan file dan gaya kode.
5. `10-validation-rules.md` & `11-permissions.md` — jika task melibatkan input user atau kontrol akses.
6. `12-workflows.md` — jika task melibatkan proses multi-langkah (checkout, feature toggle, dsb).
7. `16-definition-of-done.md` — SELALU, sebelum menyatakan task selesai.

**Jangan berasumsi** tentang keputusan desain yang sudah didokumentasikan — rujuk dokumen terkait, jangan membuat pola baru yang bertentangan tanpa alasan kuat.

## 15.2 Prinsip Kerja AI di Proyek Ini
1. **Konsistensi di atas kreativitas.** Jika ada pola yang sudah dipakai di modul lain untuk kasus serupa (mis. struktur service, penamaan DTO), ikuti pola tersebut — jangan menciptakan pendekatan baru tanpa alasan.
2. **Feature-flag by default untuk fitur non-core.** Setiap kali membuat modul/endpoint baru yang bukan bagian dari fitur inti (lihat daftar core di `03-business-rules.md` §3.2.2 dan `07-folder-structure.md` §7.2), AI **wajib**:
   - Menambahkan entry `Feature` baru (via seed atau migration) dengan key yang sesuai konvensi (`09-project-conventions.md` §9.4).
   - Menggunakan `@RequireFeature('key')` di controller terkait.
   - Menyembunyikan UI terkait di frontend menggunakan `useFeature('key')`.
   - **Tidak boleh melewatkan salah satu dari tiga langkah di atas** — modul baru tanpa feature flag adalah bug, bukan pilihan valid, kecuali eksplisit merupakan fitur core.
3. **Tenant scoping tidak boleh diasumsikan aman.** Setiap kali menulis query Prisma baru untuk model tenant-scoped, AI wajib eksplisit menyertakan `tenantId` di `where` clause (meski middleware/extension sudah menangani secara global) sebagai defense-in-depth, dan menulis test yang memverifikasi isolasi tenant untuk endpoint baru tersebut.
4. **Jangan generate data dummy/mock di kode produksi.** Data contoh hanya boleh berada di file seed (`prisma/seed.ts`) atau file test, tidak pernah di service/controller.
5. **Migration database harus reversible secara konsep.** Jelaskan di deskripsi PR/commit apa dampak migration terhadap data existing, terutama jika mengubah kolom yang sudah dipakai fitur aktif.

## 15.3 Saat Membuat Fitur Baru (Alur Kerja Standar untuk AI)
Ketika diminta membuat fitur baru, AI mengikuti urutan ini:
```
1. Cek apakah fitur ini core atau opsional (tanyakan jika ambigu, jangan asumsikan)
2. Jika opsional:
   a. Tambahkan Feature baru di skema seed dengan key, name, category
   b. Tentukan dependency ke fitur lain (jika ada) dan catat di 03-business-rules.md
3. Rancang/perbarui skema Prisma jika perlu data baru (ikuti konvensi 04-database.md)
4. Buat migration
5. Buat modul NestJS mengikuti struktur baku (07-folder-structure.md §7.2)
   - DTO dengan validasi (10-validation-rules.md)
   - Guard: JwtAuthGuard, FeatureFlagGuard (jika opsional), RolesGuard
   - Service berisi business logic, controller tipis
6. Tulis unit test untuk business logic non-trivial
7. Update dokumentasi API (05-api-spec.md) dengan endpoint baru
8. Buat/update hook frontend (TanStack Query) sesuai 13-state-management.md
9. Buat komponen UI, gunakan useFeature() untuk conditional rendering jika opsional
10. Update 06-ui-guidelines.md jika ada pola UI baru yang perlu didokumentasikan
11. Cross-check terhadap 16-definition-of-done.md sebelum menyatakan selesai
```

## 15.4 Larangan Eksplisit untuk AI
AI **dilarang** melakukan hal berikut tanpa konfirmasi eksplisit dari manusia:
- Mengubah skema database yang mempengaruhi tabel `Tenant`, `TenantFeature`, atau `Order` dengan cara yang breaking (hapus kolom, ubah tipe data yang sudah dipakai).
- Menghapus atau menonaktifkan test yang sudah ada untuk "membuat build lolos" — jika test gagal karena perubahan yang disengaja, update test-nya dengan penjelasan, jangan dihapus diam-diam.
- Menambahkan dependency/package baru ke `package.json` tanpa menyebutkan alasannya di commit/PR description (menjaga bundle size dan attack surface tetap terkendali).
- Membuat endpoint baru yang mengembalikan data lintas tenant tanpa guard `PlatformAdmin` yang eksplisit.
- Melakukan perubahan besar pada lebih dari 1 modul fitur sekaligus dalam satu task/PR — pecah menjadi task terpisah (memudahkan review dan debugging).
- Menyimpan credential/API key apapun langsung di kode (selalu lewat `.env` atau `TenantFeature.config` terenkripsi).

## 15.5 Menangani Ambiguitas
Jika instruksi dari manusia ambigu atau berpotensi bertentangan dengan business rules yang sudah didokumentasikan:
1. AI mengambil interpretasi paling masuk akal berdasarkan dokumen yang ada, **menyatakan asumsi yang diambil secara eksplisit** di awal jawaban/PR description.
2. Jika ambiguitas berdampak besar (menyentuh skema data inti, keamanan, atau alur pembayaran), AI sebaiknya bertanya lebih dulu daripada berasumsi.
3. AI tidak boleh diam-diam mengubah keputusan desain yang sudah tertulis di `docs/` untuk "menyelesaikan" task lebih mudah — jika dokumen perlu diubah, itu adalah task terpisah yang eksplisit (`docs/...` PR), bukan efek samping dari task fitur.

## 15.6 Konsistensi Lintas Task
Karena proyek ini akan dikerjakan bertahap (banyak sesi/task terpisah, kemungkinan oleh AI yang berbeda), setiap task **wajib**:
- Membaca ulang dokumen relevan di awal sesi (jangan mengandalkan memori dari sesi sebelumnya).
- Memeriksa kode existing di modul serupa sebelum menulis kode baru, untuk menjaga konsistensi pola (mis. lihat bagaimana modul `promotion/voucher` menangani feature flag sebelum membuat modul `loyalty` baru).
- Memperbarui dokumen terkait (`05-api-spec.md`, `04-database.md`, dll) sebagai bagian dari task, bukan task terpisah yang "akan dikerjakan nanti" — dokumentasi yang basi lebih berbahaya daripada tidak ada dokumentasi.

## 15.7 Format Output yang Diharapkan dari AI
- Kode production-ready mengikuti `08-coding-standards.md`, bukan pseudocode, kecuali eksplisit diminta contoh/draft.
- Setiap PR/commit besar disertai ringkasan singkat: fitur apa, menyentuh modul apa, apakah ada perubahan skema/migration, apakah fitur baru sudah di-flag.
- Jika membuat banyak file dalam satu task, susun secara logis mengikuti urutan dependency (skema → backend service → backend controller → frontend hook → frontend UI), bukan acak.

## 15.8 Referensi Task
Task-task konkret dan breakdown pekerjaan tersimpan di folder `docs/tasks/` — AI mengerjakan berdasarkan task yang diberikan di sana, dan dapat menambahkan task baru mengikuti format yang sama saat memecah pekerjaan besar menjadi lebih kecil (lihat `docs/tasks/README.md` untuk format).