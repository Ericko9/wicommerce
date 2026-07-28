import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { FeatureFlagService } from '../src/core/feature-flag/feature-flag.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { RedisService } from '../src/common/redis/redis.service';
import { AuditService } from '../src/core/audit/audit.service';

describe('FeatureFlagService Unit Tests', () => {
  let service: FeatureFlagService;
  let prisma: any;
  let redis: any;

  const mockPrisma = {
    feature: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    tenantFeature: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockAudit = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<FeatureFlagService>(FeatureFlagService);
    prisma = module.get(PrismaService);
    redis = module.get(RedisService);

    jest.clearAllMocks();
  });

  it('should reject disabling a core feature with CANNOT_MODIFY_CORE_FEATURE (400)', async () => {
    prisma.feature.findUnique.mockResolvedValue({
      id: 'f-1',
      key: 'product_catalog',
      name: 'Katalog Produk Dasar',
      isCore: true,
    });

    await expect(
      service.toggleFeature('tenant-123', 'product_catalog', false, 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject disabling promotion_engine if flash_sale is active (409)', async () => {
    prisma.feature.findUnique.mockResolvedValue({
      id: 'f-promo',
      key: 'promotion_engine',
      name: 'Promosi & Diskon',
      isCore: false,
    });

    prisma.tenantFeature.findFirst.mockImplementation(({ where }: any) => {
      if (where?.feature?.key === 'flash_sale') {
        return Promise.resolve({ isEnabled: true });
      }
      return Promise.resolve(null);
    });

    await expect(
      service.toggleFeature('tenant-123', 'promotion_engine', false, 'user-1'),
    ).rejects.toThrow(ConflictException);
  });

  it('should successfully toggle an independent feature and invalidate Redis cache', async () => {
    prisma.feature.findUnique.mockResolvedValue({
      id: 'f-variants',
      key: 'product_variants',
      name: 'Varian Produk',
      isCore: false,
    });

    prisma.tenantFeature.findFirst.mockResolvedValue(null);
    prisma.tenantFeature.findUnique.mockResolvedValue(null);
    prisma.tenantFeature.upsert.mockResolvedValue({
      id: 'tf-1',
      tenantId: 'tenant-123',
      featureId: 'f-variants',
      isEnabled: true,
    });

    const result = await service.toggleFeature('tenant-123', 'product_variants', true, 'user-1');

    expect(result.isEnabled).toBe(true);
    expect(redis.del).toHaveBeenCalledWith('feature:tenant-123:product_variants');
    expect(mockAudit.log).toHaveBeenCalled();
  });
});
