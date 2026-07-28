import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OrderService } from '../src/core/order/order.service';
import { CartService } from '../src/core/order/cart.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { OrderStatus, ProductStatus } from '@ucp/database';
import { PaymentMethodType } from '../src/core/order/dto/checkout.dto';

describe('OrderService Unit Tests', () => {
  let service: OrderService;
  let prisma: any;

  const mockPrisma: any = {
    tenantSetting: {
      findUnique: jest.fn(),
    },
    warehouse: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
    },
    inventoryItem: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    orderStatusHistory: {
      create: jest.fn(),
    },
    payment: {
      update: jest.fn(),
    },
  };
  mockPrisma.$transaction = jest.fn((cb: any) => cb(mockPrisma));

  const mockCartService = {
    clearCart: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CartService, useValue: mockCartService },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('should successfully create checkout, calculate snapshot subtotal and decrement stock', async () => {
    prisma.tenantSetting.findUnique.mockResolvedValue({ paymentDueHours: 24 });
    prisma.warehouse.findFirst.mockResolvedValue({ id: 'w-1', isDefault: true });

    prisma.product.findFirst.mockResolvedValue({
      id: 'p-1',
      name: 'Kopi Susu',
      basePrice: 20000,
      status: ProductStatus.ACTIVE,
      variants: [{ id: 'v-1' }],
    });

    prisma.inventoryItem.findFirst.mockResolvedValue({ id: 'inv-1', quantity: 10 });
    prisma.inventoryItem.update.mockResolvedValue({ id: 'inv-1', quantity: 8 });

    prisma.order.create.mockImplementation(({ data }: any) =>
      Promise.resolve({
        id: 'ord-1',
        orderNumber: data.orderNumber,
        status: data.status,
        totalAmount: data.totalAmount,
        items: data.items.create,
      }),
    );

    const result = await service.createCheckout('tenant-1', 'cust-1', {
      items: [{ productId: 'p-1', quantity: 2 }],
      shippingAddress: {
        recipient: 'Budi',
        phone: '08123456789',
        fullAddress: 'Jl. Merdeka 10',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '10110',
      },
      paymentMethod: PaymentMethodType.MANUAL_TRANSFER,
    });

    expect(result.order.totalAmount).toBe(40000);
    expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: 'inv-1' },
      data: { quantity: 8 },
    });
  });

  it('should reject checkout if product stock is insufficient', async () => {
    prisma.tenantSetting.findUnique.mockResolvedValue({ paymentDueHours: 24 });
    prisma.warehouse.findFirst.mockResolvedValue({ id: 'w-1', isDefault: true });

    prisma.product.findFirst.mockResolvedValue({
      id: 'p-1',
      name: 'Kopi Susu',
      basePrice: 20000,
      status: ProductStatus.ACTIVE,
      variants: [{ id: 'v-1' }],
    });

    prisma.inventoryItem.findFirst.mockResolvedValue({ id: 'inv-1', quantity: 1 });

    await expect(
      service.createCheckout('tenant-1', 'cust-1', {
        items: [{ productId: 'p-1', quantity: 5 }],
        shippingAddress: {
          recipient: 'Budi',
          phone: '08123456789',
          fullAddress: 'Jl. Merdeka 10',
          city: 'Jakarta',
          province: 'DKI Jakarta',
          postalCode: '10110',
        },
        paymentMethod: PaymentMethodType.MANUAL_TRANSFER,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject invalid order status transition from PENDING_PAYMENT to COMPLETED', async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: 'ord-1',
      tenantId: 'tenant-1',
      status: OrderStatus.PENDING_PAYMENT,
      items: [],
    });

    await expect(
      service.updateOrderStatus('tenant-1', 'ord-1', OrderStatus.COMPLETED, 'Direct complete'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should restore stock when order is cancelled or expired', async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: 'ord-1',
      tenantId: 'tenant-1',
      status: OrderStatus.PENDING_PAYMENT,
      items: [{ productId: 'p-1', quantity: 3 }],
    });

    prisma.warehouse.findFirst.mockResolvedValue({ id: 'w-1', isDefault: true });
    prisma.inventoryItem.findFirst.mockResolvedValue({ id: 'inv-1', quantity: 5 });
    prisma.order.update.mockResolvedValue({ id: 'ord-1', status: OrderStatus.EXPIRED });

    await service.updateOrderStatus('tenant-1', 'ord-1', OrderStatus.EXPIRED, 'Payment timeout');

    expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: 'inv-1' },
      data: { quantity: 8 },
    });
  });
});
