import { tenantExtension } from '@ucp/database';

describe('Tenant Isolation & Prisma Extension Unit Test', () => {
  it('should auto-inject tenantId into query where args for tenant-scoped models during findMany/findFirst/count/updateMany/deleteMany', async () => {
    const extension = tenantExtension('tenant-abc');

    let extensionQueryConfig: any = null;
    const mockClient = {
      $extends: (config: any) => {
        extensionQueryConfig = config.query.$allModels;
        return mockClient;
      },
    };

    extension(mockClient as any);

    expect(extensionQueryConfig).toBeDefined();
    expect(extensionQueryConfig.$allOperations).toBeDefined();

    const mockQuery = jest.fn().mockImplementation((args) => Promise.resolve(args));

    // Test findMany on Product model
    const initialArgs = { where: { status: 'ACTIVE' } };
    await extensionQueryConfig.$allOperations({
      model: 'Product',
      operation: 'findMany',
      args: initialArgs,
      query: mockQuery,
    });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'ACTIVE', tenantId: 'tenant-abc' },
      }),
    );

    // Test create operation on Order model (injects data.tenantId)
    const createArgs = { data: { orderNumber: 'ORD-1' } };
    await extensionQueryConfig.$allOperations({
      model: 'Order',
      operation: 'create',
      args: createArgs,
      query: mockQuery,
    });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { orderNumber: 'ORD-1', tenantId: 'tenant-abc' },
      }),
    );
  });

  it('should NOT inject tenantId for non-tenant-scoped models', async () => {
    const extension = tenantExtension('tenant-xyz');

    let extensionQueryConfig: any = null;
    const mockClient = {
      $extends: (config: any) => {
        extensionQueryConfig = config.query.$allModels;
        return mockClient;
      },
    };

    extension(mockClient as any);

    const mockQuery = jest.fn().mockImplementation((args) => Promise.resolve(args));

    const initialArgs = { where: { key: 'basic' } };
    await extensionQueryConfig.$allOperations({
      model: 'Plan',
      operation: 'findMany',
      args: initialArgs,
      query: mockQuery,
    });

    expect(mockQuery).toHaveBeenCalledWith({
      where: { key: 'basic' },
    });
  });

  it('should block cross-tenant header spoofing in TenantResolverMiddleware', async () => {
    const { TenantResolverMiddleware } = require('../src/common/middleware/tenant-resolver.middleware');
    const { ForbiddenException } = require('@nestjs/common');

    const mockPrismaService = {
      tenant: { findUnique: jest.fn(), findFirst: jest.fn() },
    };
    const mockConfigService = {
      get: jest.fn().mockReturnValue('super-secret-access-token-key-change-in-prod'),
    };
    const mockJwtService = {
      verify: jest.fn().mockReturnValue({ tenantId: 'poc-tenant-id' }),
    };

    const middleware = new TenantResolverMiddleware(
      mockPrismaService as any,
      mockConfigService as any,
      mockJwtService as any,
    );

    const req: any = {
      headers: {
        'x-tenant-id': 'victim-toko-berkah-id',
        authorization: 'Bearer valid-jwt-token-for-poc-tenant',
      },
    };
    const res: any = {};
    const next = jest.fn();

    await expect(middleware.use(req, res, next)).rejects.toThrow(ForbiddenException);
  });
});
