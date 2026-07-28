# 14. Non-Functional Requirements

## 14.1 Performa

| Aspek | Target |
|---|---|
| Time to First Byte (storefront, halaman produk) | < 500ms (dengan ISR/caching) |
| Largest Contentful Paint (storefront mobile) | < 2.5s (koneksi 4G rata-rata Indonesia) |
| Response API p95 (admin/storefront CRUD standar) | < 300ms |
| Response API p95 (checkout, termasuk transaction DB) | < 800ms |
| Query database list dengan pagination | < 150ms pada dataset hingga 100rb baris per tenant |
| Konkurensi checkout produk stok terbatas | Tidak overselling meski >50 request checkout bersamaan pada 1 produk (dijamin via row locking, lihat `12-workflows.md` §12.3) |

Strategi pencapaian:
- Cache feature flag & store-info di Redis (§3.2.3).
- ISR (Incremental Static Regeneration) untuk halaman produk storefront, revalidate on-demand saat produk diubah (webhook internal dari backend ke Next.js revalidation API).
- Index database sesuai `04-database.md` §4.4.
- Connection pooling PostgreSQL (PgBouncer) jika jumlah tenant/traffic bertumbuh signifikan.

## 14.2 Skalabilitas
1. Arsitektur awal: **modular monolith** dalam satu deployment (memudahkan operasional untuk tim kecil), namun modul dirancang cukup terisolasi (lihat `07-folder-structure.md`) sehingga dapat diekstrak ke service terpisah di masa depan jika satu modul (mis. `payment-gateway` atau `notification`) membutuhkan scaling independen.
2. Database: mulai dengan single PostgreSQL instance; rencana horizontal scaling via **read replica** untuk query laporan/analytics berat sebelum mempertimbangkan sharding per tenant (hanya jika jumlah tenant sudah sangat besar, di luar cakupan awal).
3. Redis: gunakan Redis Cluster jika volume cache/queue melebihi kapasitas single instance.
4. Target awal: mendukung hingga **1.000 tenant aktif** dan **~50.000 order/bulan** gabungan tanpa perubahan arsitektur signifikan.

## 14.3 Keamanan

### 14.3.1 Autentikasi & Otorisasi
- Password di-hash dengan **bcrypt** (cost factor minimal 10) atau **argon2**.
- JWT access token berumur pendek (15 menit), refresh token disimpan sebagai httpOnly + Secure + SameSite=Strict cookie.
- Rate limiting ketat pada endpoint auth (lihat `05-api-spec.md` §5.10).

### 14.3.2 Isolasi Data Tenant
- Setiap query wajib ter-scope `tenantId` (§4.3) — diuji dengan test khusus yang memverifikasi tenant A tidak bisa mengakses data tenant B lewat manipulasi ID di URL/body (IDOR testing).
- ID resource menggunakan `cuid()` (non-sequential) untuk mempersulit enumerasi.

### 14.3.3 Data Sensitif
- Kredensial pihak ketiga milik tenant (API key Midtrans/Xendit di `TenantFeature.config`) **wajib dienkripsi** at-rest (AES-256, key dikelola via KMS/env secret terpisah dari database), bukan disimpan sebagai plaintext JSON.
- Data pembayaran (nomor kartu, dsb) **tidak pernah** disimpan di sistem sendiri — sepenuhnya didelegasikan ke payment gateway (PCI-DSS scope minimal).

### 14.3.4 Proteksi Umum
- Terapkan header keamanan standar (`Helmet` di NestJS): `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`.
- Validasi & sanitasi input (lihat `10-validation-rules.md` §10.11) mencegah XSS/SQL Injection.
- CORS dikonfigurasi ketat: hanya domain storefront/admin resmi yang diizinkan; webhook payment diverifikasi via signature, bukan CORS.
- Audit log untuk semua aksi sensitif (§3.10), disimpan minimal 1 tahun.
- Dependency di-scan otomatis (`npm audit` / Dependabot / Snyk) di CI.

### 14.3.5 Webhook Security
- Setiap webhook (payment gateway) wajib verifikasi signature sesuai spesifikasi provider sebelum diproses.
- Endpoint webhook idempotent (§12.5) untuk menahan retry duplikat dari provider.

## 14.4 Ketersediaan (Availability)
- Target uptime: **99.5%** di fase awal (setara ~3.6 jam downtime/bulan yang dapat ditoleransi), ditingkatkan ke 99.9% seiring skala.
- Health check endpoint (`/health`) untuk load balancer/orchestrator.
- Graceful shutdown: NestJS menyelesaikan request berjalan dan job queue sebelum container berhenti (`SIGTERM` handler).
- Backup database otomatis harian (retensi 30 hari) + snapshot sebelum migration besar.

## 14.5 Observability
- **Logging**: structured JSON log (Pino), terpusat (mis. Loki/CloudWatch), wajib menyertakan `tenantId`, `requestId`, `userId` (§8.7).
- **Metrics**: expose endpoint metrics (Prometheus format) untuk request rate, error rate, latency per endpoint (RED metrics).
- **Tracing**: opsional fase lanjut (OpenTelemetry) untuk melacak request lintas modul saat kompleksitas bertambah.
- **Error Tracking**: Sentry terintegrasi di backend & kedua frontend, dengan tag `tenantId` untuk mempermudah debugging masalah spesifik tenant.
- **Alerting**: alert otomatis untuk error rate > threshold, job queue menumpuk (BullMQ backlog), disk/memory database mendekati limit.

## 14.6 Backward Compatibility & Data Migration
- Perubahan skema database yang breaking (hapus/rename kolom yang dipakai aktif) wajib melalui strategi **expand-contract**: tambah kolom baru → migrasi data → update kode untuk pakai kolom baru → baru hapus kolom lama di migration terpisah setelah dipastikan aman.
- API versi lama tetap didukung selama deprecation window (§9.6).

## 14.7 Internationalization Readiness
- Meski awal hanya Bahasa Indonesia & Rupiah, seluruh sistem dirancang i18n-ready: teks UI lewat translation layer, mata uang & format tanggal via `Intl` API bukan hardcode string (lihat `06-ui-guidelines.md` §6.8).

## 14.8 Compliance & Privasi Data
- Kepatuhan dasar terhadap **UU PDP (Perlindungan Data Pribadi) Indonesia**: consent eksplisit saat registrasi customer, hak penghapusan data (right to be forgotten — soft delete lalu hard delete setelah periode retensi, §3.10), kebijakan privasi jelas dapat diakses di storefront setiap tenant.
- Data customer satu tenant tidak boleh digunakan untuk kepentingan tenant lain (mis. tidak ada cross-tenant marketing tanpa consent eksplisit).

## 14.9 Testing Non-Functional
- **Load testing** (k6/Artillery) untuk endpoint checkout dan list produk sebelum rilis fitur besar atau menjelang traffic tinggi (mis. kampanye flash sale).
- **Security testing** dasar (OWASP Top 10 checklist) sebagai bagian dari review sebelum rilis major.
