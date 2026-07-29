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
});
