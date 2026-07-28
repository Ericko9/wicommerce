import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InventoryService } from '../src/core/inventory/inventory.service';
import { InventoryAdjustmentType } from '../src/core/inventory/dto/adjust-inventory.dto';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('InventoryService Unit Tests', () => {
  let service: InventoryService;
  let prisma: any;

  const mockPrisma: any = {
    product: {
      findFirst: jest.fn(),
    },
    warehouse: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    inventoryItem: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  mockPrisma.$transaction = jest.fn((cb: any) => cb(mockPrisma));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('should successfully increase stock with type IN', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p-1', tenantId: 'tenant-1' });
    prisma.warehouse.findFirst.mockResolvedValue({ id: 'w-1', isDefault: true });
    prisma.inventoryItem.findFirst.mockResolvedValue({ id: 'item-1', quantity: 10 });
    prisma.inventoryItem.update.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'item-1', quantity: data.quantity }),
    );

    const result = await service.adjustInventory('tenant-1', {
      productId: 'p-1',
      type: InventoryAdjustmentType.IN,
      quantity: 5,
    });

    expect(result.quantity).toBe(15);
  });

  it('should reject adjustment if resulting stock would be < 0', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p-1', tenantId: 'tenant-1' });
    prisma.warehouse.findFirst.mockResolvedValue({ id: 'w-1', isDefault: true });
    prisma.inventoryItem.findFirst.mockResolvedValue({ id: 'item-1', quantity: 3 });

    await expect(
      service.adjustInventory('tenant-1', {
        productId: 'p-1',
        type: InventoryAdjustmentType.OUT,
        quantity: 5,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
