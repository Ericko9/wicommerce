import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from '../src/core/catalog/product.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { S3Service } from '../src/common/s3/s3.service';

describe('ProductService Unit Tests', () => {
  let service: ProductService;
  let prisma: any;

  const mockPrisma: any = {
    product: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    productVariant: {
      create: jest.fn(),
    },
    inventoryItem: {
      create: jest.fn(),
    },
    warehouse: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
  };
  mockPrisma.$transaction = jest.fn((cb: any) => cb(mockPrisma));

  const mockS3 = {
    getPresignedUploadUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: S3Service, useValue: mockS3 },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('should auto-generate slug in kebab-case from product name', async () => {
    prisma.product.findUnique.mockResolvedValue(null);
    prisma.warehouse.findFirst.mockResolvedValue({ id: 'w-1', isDefault: true });
    prisma.productVariant.create.mockResolvedValue({ id: 'v-1' });
    prisma.product.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'p-1', ...data }),
    );

    await service.createProduct('tenant-1', {
      name: 'Kopi Susu Gula Aren!',
      basePrice: 18000,
    });

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: 'kopi-susu-gula-aren',
        }),
      }),
    );
  });
});
