export const storefrontQueryKeys = {
  storeInfo: ['storefront-info'] as const,
  categories: ['storefront-categories'] as const,
  products: {
    all: ['storefront-products'] as const,
    list: (filters: Record<string, any>) => ['storefront-products', 'list', filters] as const,
    detail: (slug: string) => ['storefront-products', 'detail', slug] as const,
  },
  cart: ['storefront-cart'] as const,
  myOrders: ['storefront-my-orders'] as const,
};
