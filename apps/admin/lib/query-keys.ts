export const queryKeys = {
  features: {
    all: ['features'] as const,
  },
  products: {
    all: ['products'] as const,
    list: (filters: Record<string, any>) => ['products', 'list', filters] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
    variants: (id: string) => ['products', id, 'variants'] as const,
  },
  categories: {
    all: ['categories'] as const,
  },
  inventory: {
    all: ['inventory'] as const,
  },
  orders: {
    all: ['orders'] as const,
    list: (filters: Record<string, any>) => ['orders', 'list', filters] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
  },
  settings: {
    tenant: ['tenant-settings'] as const,
  },
};
