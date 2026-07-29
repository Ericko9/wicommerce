import { Test, TestingModule } from '@nestjs/testing';
import { StorefrontCatalogService } from '../src/core/storefront-catalog/storefront-catalog.service';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('StorefrontCatalogService Unit Tests', () => {
  let service: StorefrontCatalogService;
  let prisma: any;

  const mockPrisma: any = {
    tenantSetting: {
      findUnique: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorefrontCatalogService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<StorefrontCatalogService>(StorefrontCatalogService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('should return accurate meta.total from database count query instead of page items length', async () => {
    prisma.tenantSetting.findUnique.mockResolvedValue({ hideWhenOutOfStock: false });

    // Mock 20 products returned for page 1 out of 100 total products in DB
    const mockProducts = Array.from({ length: 20 }, (_, i) => ({
      id: `prod-${i}`,
      name: `Product ${i}`,
      slug: `product-${i}`,
      basePrice: 10000,
      category: null,
      images: [],
      inventoryItems: [{ quantity: 10 }],
    }));

    prisma.product.findMany.mockResolvedValue(mockProducts);
    prisma.product.count.mockResolvedValue(100);

    const result = await service.getProducts('tenant-1', { page: 1, limit: 20 });

    expect(result.items.length).toBe(20);
    expect(result.meta.total).toBe(100);
    expect(result.meta.totalPages).toBe(5);
  });
});
