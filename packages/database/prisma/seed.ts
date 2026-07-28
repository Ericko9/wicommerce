import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding system features and plans...');

  // 1. Features
  const featuresData = [
    {
      key: 'product_catalog',
      name: 'Katalog Produk Dasar',
      category: 'catalog',
      isCore: true,
      description: 'Manajemen produk dan kategori dasar',
    },
    {
      key: 'checkout',
      name: 'Checkout & Pembayaran Manual',
      category: 'catalog',
      isCore: true,
      description: 'Alur checkout dan transfer manual/COD',
    },
    {
      key: 'order_management',
      name: 'Manajemen Pesanan',
      category: 'operations',
      isCore: true,
      description: 'Kelola status pesanan dan rincian transaksi',
    },
    {
      key: 'product_variants',
      name: 'Varian Produk',
      category: 'catalog',
      isCore: false,
      description: 'Dukungan varian warna, ukuran, dan SKU terpisah',
    },
    {
      key: 'multi_warehouse',
      name: 'Multi Gudang & Stok Cabang',
      category: 'operations',
      isCore: false,
      description: 'Pengelolaan inventaris di banyak lokasi gudang',
    },
    {
      key: 'payment_midtrans',
      name: 'Payment Gateway Midtrans',
      category: 'payment',
      isCore: false,
      description: 'Integrasi pembayaran online otomatis Midtrans',
    },
    {
      key: 'payment_xendit',
      name: 'Payment Gateway Xendit',
      category: 'payment',
      isCore: false,
      description: 'Integrasi pembayaran online otomatis Xendit',
    },
    {
      key: 'promotion_engine',
      name: 'Promosi & Diskon Voucher',
      category: 'marketing',
      isCore: false,
      description: 'Sistem kode voucher dan potongan harga',
    },
    {
      key: 'flash_sale',
      name: 'Flash Sale (Membutuhkan Promotion Engine)',
      category: 'marketing',
      isCore: false,
      description: 'Promosi harga khusus dengan batas waktu dan stok',
    },
    {
      key: 'loyalty_points',
      name: 'Loyalty Points',
      category: 'marketing',
      isCore: false,
      description: 'Program poin belanja untuk pelanggan',
    },
    {
      key: 'advanced_reporting',
      name: 'Laporan Analitik Lanjutan',
      category: 'operations',
      isCore: false,
      description: 'Laporan penjualan, tren, dan ekspor data',
    },
  ];

  const featuresMap = new Map<string, string>();
  for (const feat of featuresData) {
    const created = await prisma.feature.upsert({
      where: { key: feat.key },
      update: {
        name: feat.name,
        category: feat.category,
        isCore: feat.isCore,
        description: feat.description,
      },
      create: feat,
    });
    featuresMap.set(feat.key, created.id);
  }

  // 2. Plans & PlanFeatures
  const plansData = [
    {
      key: 'basic',
      name: 'Paket Basic',
      priceMonth: 99000,
      featureKeys: ['product_catalog', 'checkout', 'order_management'],
    },
    {
      key: 'pro',
      name: 'Paket Pro',
      priceMonth: 299000,
      featureKeys: [
        'product_catalog',
        'checkout',
        'order_management',
        'product_variants',
        'payment_midtrans',
        'payment_xendit',
        'promotion_engine',
      ],
    },
    {
      key: 'enterprise',
      name: 'Paket Enterprise',
      priceMonth: 799000,
      featureKeys: [
        'product_catalog',
        'checkout',
        'order_management',
        'product_variants',
        'multi_warehouse',
        'payment_midtrans',
        'payment_xendit',
        'promotion_engine',
        'flash_sale',
        'loyalty_points',
        'advanced_reporting',
      ],
    },
  ];

  for (const planDef of plansData) {
    const plan = await prisma.plan.upsert({
      where: { key: planDef.key },
      update: {
        name: planDef.name,
        priceMonth: planDef.priceMonth,
      },
      create: {
        key: planDef.key,
        name: planDef.name,
        priceMonth: planDef.priceMonth,
      },
    });

    for (const fKey of planDef.featureKeys) {
      const fId = featuresMap.get(fKey);
      if (fId) {
        await prisma.planFeature.upsert({
          where: {
            planId_featureId: {
              planId: plan.id,
              featureId: fId,
            },
          },
          update: {},
          create: {
            planId: plan.id,
            featureId: fId,
          },
        });
      }
    }
  }

  // 3. Platform Admin
  await prisma.platformAdmin.upsert({
    where: { email: 'admin@ucp.local' },
    update: {},
    create: {
      email: 'admin@ucp.local',
      name: 'Super Admin Platform',
      // bcrypt hash for 'admin123'
      passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6L6532W.69u23wXW',
    },
  });

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
