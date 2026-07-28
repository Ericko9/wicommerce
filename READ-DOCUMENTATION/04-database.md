# 04. Database Schema

## 4.1 Prinsip Desain
1. **Shared database, shared schema** — semua tenant berbagi tabel yang sama, dipisahkan lewat kolom `tenantId`.
2. Setiap tabel yang bersifat data operasional tenant **wajib** memiliki `tenantId` dan index pada kolom tersebut (biasanya composite index bersama kolom yang sering di-filter, mis. `[tenantId, status]`).
3. Gunakan **Prisma Middleware** (`prisma.$use`) atau **NestJS Interceptor** untuk otomatis menyuntikkan filter `tenantId` di semua query — mencegah developer lupa menambahkan filter secara manual.
4. Gunakan `cuid()` sebagai primary key (bukan auto-increment integer) untuk mencegah enumerasi ID lintas tenant.
5. Soft delete (`deletedAt`) digunakan untuk entitas penting (Product, Order, Customer) agar histori tidak hilang.

## 4.2 Skema Prisma (Inti)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// =========================================
// PLATFORM LEVEL (Super Admin scope)
// =========================================

model Plan {
  id          String   @id @default(cuid())
  key         String   @unique // "basic" | "pro" | "enterprise"
  name        String
  priceMonth  Int      // dalam rupiah
  isActive    Boolean  @default(true)
  features    PlanFeature[]
  tenants     Tenant[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Feature {
  id          String   @id @default(cuid())
  key         String   @unique // "multi_warehouse", "loyalty_points", dst
  name        String
  description String?
  category    String   // "catalog" | "payment" | "shipping" | "marketing" | "operations"
  isCore      Boolean  @default(false)
  planFeatures    PlanFeature[]
  tenantFeatures  TenantFeature[]
  createdAt   DateTime @default(now())
}

model PlanFeature {
  id        String  @id @default(cuid())
  planId    String
  featureId String
  plan      Plan    @relation(fields: [planId], references: [id])
  feature   Feature @relation(fields: [featureId], references: [id])

  @@unique([planId, featureId])
}

model PlatformAdmin {
  id        String   @id @default(cuid())
  email     String   @unique
  passwordHash String
  name      String
  createdAt DateTime @default(now())
}

// =========================================
// TENANT LEVEL
// =========================================

enum TenantStatus {
  PENDING
  ACTIVE
  SUSPENDED
  CLOSED
}

model Tenant {
  id          String       @id @default(cuid())
  name        String
  subdomain   String       @unique
  customDomain String?     @unique
  status      TenantStatus @default(PENDING)
  planId      String
  plan        Plan         @relation(fields: [planId], references: [id])

  settings    TenantSetting?
  features    TenantFeature[]
  warehouses  Warehouse[]
  products    Product[]
  categories  Category[]
  customers   Customer[]
  orders      Order[]
  users       TenantUser[]
  vouchers    Voucher[]
  auditLogs   AuditLog[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  @@index([status])
}

model TenantSetting {
  id                  String  @id @default(cuid())
  tenantId            String  @unique
  tenant              Tenant  @relation(fields: [tenantId], references: [id])
  storeName           String
  logoUrl             String?
  themeColor          String?
  currency            String  @default("IDR")
  paymentDueHours      Int     @default(24)
  hideWhenOutOfStock  Boolean @default(false)
  loyaltyPointRatio   Int?    // Rp per 1 poin
  updatedAt           DateTime @updatedAt
}

model TenantFeature {
  id        String   @id @default(cuid())
  tenantId  String
  featureId String
  isEnabled Boolean  @default(false)
  config    Json?
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  feature   Feature  @relation(fields: [featureId], references: [id])
  updatedAt DateTime @updatedAt

  @@unique([tenantId, featureId])
  @@index([tenantId, isEnabled])
}

// =========================================
// USER & RBAC
// =========================================

enum TenantRole {
  OWNER
  ADMIN
  STAFF
  CASHIER
}

model TenantUser {
  id           String     @id @default(cuid())
  tenantId     String
  tenant       Tenant     @relation(fields: [tenantId], references: [id])
  email        String
  passwordHash String
  name         String
  role         TenantRole
  isActive     Boolean    @default(true)
  createdAt    DateTime   @default(now())

  @@unique([tenantId, email])
  @@index([tenantId])
}

// =========================================
// CATALOG
// =========================================

enum ProductStatus {
  DRAFT
  ACTIVE
  ARCHIVED
}

model Category {
  id        String    @id @default(cuid())
  tenantId  String
  tenant    Tenant    @relation(fields: [tenantId], references: [id])
  name      String
  slug      String
  parentId  String?
  parent    Category? @relation("CategoryToCategory", fields: [parentId], references: [id])
  children  Category[] @relation("CategoryToCategory")
  products  Product[]

  @@unique([tenantId, slug])
  @@index([tenantId])
}

model Product {
  id          String        @id @default(cuid())
  tenantId    String
  tenant      Tenant        @relation(fields: [tenantId], references: [id])
  categoryId  String?
  category    Category?     @relation(fields: [categoryId], references: [id])
  name        String
  slug        String
  description String?
  status      ProductStatus @default(DRAFT)
  basePrice   Int
  images      ProductImage[]
  variants    ProductVariant[]
  inventoryItems InventoryItem[]
  orderItems  OrderItem[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  deletedAt   DateTime?

  @@unique([tenantId, slug])
  @@index([tenantId, status])
}

model ProductImage {
  id        String  @id @default(cuid())
  productId String
  product   Product @relation(fields: [productId], references: [id])
  url       String
  sortOrder Int     @default(0)
}

// Aktif hanya jika fitur "product_variants" enabled; jika tidak, 1 produk = 1 variant implisit
model ProductVariant {
  id           String   @id @default(cuid())
  productId    String
  product      Product  @relation(fields: [productId], references: [id])
  sku          String
  name         String   // contoh: "Merah / L"
  price        Int?     // override basePrice jika ada
  attributes   Json?    // { "color": "Merah", "size": "L" }
  inventoryItems InventoryItem[]
  orderItems   OrderItem[]

  @@unique([productId, sku])
}

// =========================================
// INVENTORY / WAREHOUSE
// =========================================

model Warehouse {
  id         String   @id @default(cuid())
  tenantId   String
  tenant     Tenant   @relation(fields: [tenantId], references: [id])
  name       String
  address    String?
  isDefault  Boolean  @default(false)
  inventoryItems InventoryItem[]

  @@index([tenantId])
}

model InventoryItem {
  id          String   @id @default(cuid())
  tenantId    String
  productId   String
  product     Product  @relation(fields: [productId], references: [id])
  variantId   String?
  variant     ProductVariant? @relation(fields: [variantId], references: [id])
  warehouseId String
  warehouse   Warehouse @relation(fields: [warehouseId], references: [id])
  quantity    Int      @default(0)
  updatedAt   DateTime @updatedAt

  @@unique([productId, variantId, warehouseId])
  @@index([tenantId])
}

// =========================================
// CUSTOMER
// =========================================

model Customer {
  id           String   @id @default(cuid())
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  email        String?
  phone        String?
  name         String
  passwordHash String?
  loyaltyPoints Int     @default(0)
  addresses    CustomerAddress[]
  orders       Order[]
  createdAt    DateTime @default(now())
  deletedAt    DateTime?

  @@unique([tenantId, email])
  @@index([tenantId])
}

model CustomerAddress {
  id         String   @id @default(cuid())
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id])
  label      String
  recipient  String
  phone      String
  fullAddress String
  city       String
  province   String
  postalCode String
  isDefault  Boolean  @default(false)
}

// =========================================
// ORDER
// =========================================

enum OrderStatus {
  PENDING_PAYMENT
  PAID
  PROCESSING
  SHIPPED
  COMPLETED
  CANCELLED
  REFUNDED
  EXPIRED
}

model Order {
  id            String      @id @default(cuid())
  tenantId      String
  tenant        Tenant      @relation(fields: [tenantId], references: [id])
  customerId    String
  customer      Customer    @relation(fields: [customerId], references: [id])
  orderNumber   String      // format: readable, unik per tenant
  status        OrderStatus @default(PENDING_PAYMENT)
  subtotal      Int
  discountTotal Int         @default(0)
  shippingCost  Int         @default(0)
  totalAmount   Int
  paymentMethod String      // "manual_transfer" | "midtrans" | "xendit" | "cod"
  shippingAddress Json
  items         OrderItem[]
  statusHistory OrderStatusHistory[]
  payment       Payment?
  voucherId     String?
  voucher       Voucher?    @relation(fields: [voucherId], references: [id])
  paymentDueAt  DateTime?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@unique([tenantId, orderNumber])
  @@index([tenantId, status])
  @@index([tenantId, createdAt])
}

model OrderItem {
  id         String   @id @default(cuid())
  orderId    String
  order      Order    @relation(fields: [orderId], references: [id])
  productId  String
  product    Product  @relation(fields: [productId], references: [id])
  variantId  String?
  variant    ProductVariant? @relation(fields: [variantId], references: [id])
  productNameSnapshot String
  priceSnapshot Int
  quantity   Int
  subtotal   Int
}

model OrderStatusHistory {
  id        String      @id @default(cuid())
  orderId   String
  order     Order       @relation(fields: [orderId], references: [id])
  fromStatus OrderStatus?
  toStatus  OrderStatus
  actorId   String?     // TenantUser.id atau null jika sistem
  note      String?
  createdAt DateTime    @default(now())
}

model Payment {
  id            String   @id @default(cuid())
  orderId       String   @unique
  order         Order    @relation(fields: [orderId], references: [id])
  provider      String   // "midtrans" | "xendit" | "manual"
  externalRef   String?  // ID transaksi dari payment gateway
  amount        Int
  status        String   // "PENDING" | "SUCCESS" | "FAILED"
  paidAt        DateTime?
  rawPayload    Json?
  createdAt     DateTime @default(now())
}

// =========================================
// PROMOTION (fitur opsional)
// =========================================

model Voucher {
  id                    String   @id @default(cuid())
  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])
  code                  String
  type                  String   // "PERCENTAGE" | "FIXED"
  value                 Int
  usageLimit            Int?
  usageLimitPerCustomer Int?
  usedCount             Int      @default(0)
  startAt               DateTime
  endAt                 DateTime
  orders                Order[]

  @@unique([tenantId, code])
  @@index([tenantId])
}

// =========================================
// AUDIT LOG
// =========================================

model AuditLog {
  id         String   @id @default(cuid())
  tenantId   String?
  tenant     Tenant?  @relation(fields: [tenantId], references: [id])
  actorType  String   // "TENANT_USER" | "PLATFORM_ADMIN" | "SYSTEM"
  actorId    String?
  action     String   // "FEATURE_TOGGLE" | "ORDER_STATUS_CHANGE" | dst
  entityType String
  entityId   String
  before     Json?
  after      Json?
  createdAt  DateTime @default(now())

  @@index([tenantId, createdAt])
}
```

## 4.3 Strategi Tenant Scoping di Prisma

Gunakan Prisma Client Extension (Prisma 5+) untuk auto-inject `tenantId`:

```typescript
// prisma/tenant-extension.ts
import { Prisma } from '@prisma/client';

export function tenantExtension(tenantId: string) {
  return Prisma.defineExtension((client) =>
    client.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const tenantScopedModels = ['Product', 'Order', 'Customer', 'Category', /* dst */];
            if (tenantScopedModels.includes(model!) ) {
              args.where = { ...args.where, tenantId };
            }
            return query(args);
          },
        },
      },
    })
  );
}
```
Di NestJS, request-scoped provider membuat instance Prisma client ter-extend per request berdasarkan `tenantId` dari JWT/subdomain — lihat `07-folder-structure.md` bagian `common/tenant`.

## 4.4 Indexing & Performance
- Semua foreign key `tenantId` wajib punya index (baik sendiri maupun composite).
- Kolom yang sering difilter bersamaan (`tenantId + status`, `tenantId + createdAt`) menggunakan composite index — sudah tercermin di skema di atas.
- Gunakan `EXPLAIN ANALYZE` untuk query List Order/Product dengan filter dan pagination sebelum rilis ke production.

## 4.5 Migration Policy
- Setiap perubahan schema wajib lewat `prisma migrate dev` dengan nama migration deskriptif (`add_loyalty_points_table`, bukan `update1`).
- Migration **dilarang** mengedit data langsung di file migration kecuali data seed/reference (Plan, Feature bawaan sistem).
- Breaking migration (mis. mengubah tipe kolom yang dipakai) wajib melalui review manual sebelum merge (lihat `16-definition-of-done.md`).

## 4.6 Seed Data Wajib
File `prisma/seed.ts` wajib menyediakan:
1. Daftar `Feature` bawaan sistem (lihat `03-business-rules.md` §3.2 dan `12-workflows.md` untuk daftar lengkap fitur).
2. Tiga `Plan` default: `basic`, `pro`, `enterprise` beserta `PlanFeature` masing-masing.
3. Satu akun `PlatformAdmin` default untuk development (kredensial dari `.env`, tidak boleh hardcode).
