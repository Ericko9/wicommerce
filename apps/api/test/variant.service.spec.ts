import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { ProductService } from '../src/core/catalog/product.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { S3Service } from '../src/common/s3/s3.service';

describe('Product Variant Unit Tests', () => {
  let service: ProductService;
  let prisma: any;

  const mockPrisma: any = {
    product: {
      findFirst: jest.fn(),
    },
    productVariant: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    warehouse: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    inventoryItem: {
      create: jest.fn(),
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

  it('should successfully create a product variant and allocate inventory item', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p-1', tenantId: 'tenant-1' });
    prisma.warehouse.findFirst.mockResolvedValue({ id: 'w-1', isDefault: true });

    prisma.productVariant.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'var-1',
        sku: 'SKU-RED-L',
        name: 'Merah / L',
        price: 25000,
        inventoryItems: [{ quantity: 10 }],
      });

    prisma.productVariant.create.mockResolvedValue({ id: 'var-1', sku: 'SKU-RED-L', name: 'Merah / L', price: 25000 });

    const result = await service.createVariant('tenant-1', 'p-1', {
      sku: 'SKU-RED-L',
      name: 'Merah / L',
      price: 25000,
      initialQuantity: 10,
    });

    expect(result!.sku).toBe('SKU-RED-L');
    expect(prisma.inventoryItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        variantId: 'var-1',
        quantity: 10,
      }),
    });
  });

  it('should reject variant creation if SKU already exists for the product', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p-1', tenantId: 'tenant-1' });
    prisma.productVariant.findUnique.mockResolvedValue({ id: 'existing-var', sku: 'SKU-RED-L' });

    await expect(
      service.createVariant('tenant-1', 'p-1', {
        sku: 'SKU-RED-L',
        name: 'Merah / L',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
