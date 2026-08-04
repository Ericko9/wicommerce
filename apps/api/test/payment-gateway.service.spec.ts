import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { PaymentGatewayService } from '../src/modules/payment-gateway/payment-gateway.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { RedisService } from '../src/common/redis/redis.service';
import { encryptConfig, decryptConfig } from '@ucp/utils';
import { OrderStatus } from '@ucp/database';

describe('PaymentGatewayService Unit Tests', () => {
  let service: PaymentGatewayService;
  let prisma: any;

  const mockSecret = 'test-jwt-secret-key-32-bytes-long!';

  const mockPrisma: any = {
    feature: {
      findUnique: jest.fn(),
    },
    tenantFeature: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
    order: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      update: jest.fn(),
    },
    orderStatusHistory: {
      create: jest.fn(),
    },
  };
  mockPrisma.$transaction = jest.fn((cb: any) => cb(mockPrisma));

  const mockRedis = {
    del: jest.fn(),
  };

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'ENCRYPTION_SECRET_KEY' || key === 'JWT_ACCESS_SECRET') return mockSecret;
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentGatewayService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<PaymentGatewayService>(PaymentGatewayService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('should encrypt and decrypt tenant gateway credentials correctly at rest', () => {
    const credentials = {
      merchantId: 'M12345',
      serverKey: 'SB-Mid-server-xxxx',
      clientKey: 'SB-Mid-client-yyyy',
    };

    const encrypted = encryptConfig(credentials, mockSecret);
    expect(encrypted).not.toContain('SB-Mid-server-xxxx');

    const decrypted = decryptConfig(encrypted, mockSecret);
    expect(decrypted).toEqual(credentials);
  });

  it('should reject Midtrans webhook with invalid signature key', async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: 'ord-1',
      tenantId: 'tenant-1',
      orderNumber: 'ORD-1001',
      payment: { status: 'PENDING' },
    });

    // Mock tenant Midtrans config with serverKey
    const encryptedConfig = encryptConfig({ serverKey: 'REAL-SERVER-KEY' }, mockSecret);
    prisma.tenantFeature.findFirst.mockResolvedValue({
      isEnabled: true,
      config: encryptedConfig,
    });

    const payload = {
      order_id: 'ORD-1001',
      status_code: '200',
      gross_amount: '50000.00',
      signature_key: 'INVALID-SIGNATURE-KEY',
      transaction_status: 'settlement',
    };

    await expect(service.handleMidtransWebhook(payload)).rejects.toThrow(UnauthorizedException);
  });

  it('should be idempotent and not process duplicate webhook if order is already SUCCESS', async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: 'ord-1',
      tenantId: 'tenant-1',
      orderNumber: 'ORD-1001',
      totalAmount: 50000,
      payment: { status: 'SUCCESS' },
    });

    const encryptedConfig = encryptConfig({ serverKey: 'REAL-SERVER-KEY' }, mockSecret);
    prisma.tenantFeature.findFirst.mockResolvedValue({
      isEnabled: true,
      config: encryptedConfig,
    });

    const payloadString = 'ORD-100120050000.00REAL-SERVER-KEY';
    const validSignature = require('crypto').createHash('sha512').update(payloadString).digest('hex');

    const payload = {
      order_id: 'ORD-1001',
      status_code: '200',
      gross_amount: '50000.00',
      signature_key: validSignature,
      transaction_status: 'settlement',
    };

    const result = await service.handleMidtransWebhook(payload);
    expect(result.status).toBe('SUCCESS');
    expect(result.message).toContain('idempotent');
    expect(prisma.order.update).not.toHaveBeenCalled();
  });
});
