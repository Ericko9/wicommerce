import { Prisma } from '@prisma/client';

export const TENANT_SCOPED_MODELS = [
  'TenantSetting',
  'TenantFeature',
  'TenantUser',
  'Category',
  'Product',
  'Warehouse',
  'InventoryItem',
  'Customer',
  'Order',
  'Voucher',
  'AuditLog',
];

export function tenantExtension(tenantId: string) {
  return Prisma.defineExtension((client) =>
    client.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            if (model && TENANT_SCOPED_MODELS.includes(model)) {
              if (
                operation === 'findMany' ||
                operation === 'findFirst' ||
                operation === 'count' ||
                operation === 'updateMany' ||
                operation === 'deleteMany'
              ) {
                (args as any).where = { ...((args as any).where || {}), tenantId };
              } else if (operation === 'create') {
                (args as any).data = { ...((args as any).data || {}), tenantId };
              }
            }
            return query(args);
          },
        },
      },
    }),
  );
}
