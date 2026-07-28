# 13. State Management (Frontend)

## 13.1 Prinsip Pembagian State
Bagi state menjadi 3 kategori, jangan dicampur dalam satu tool:

| Kategori | Tool | Contoh |
|---|---|---|
| **Server State** (data dari API) | TanStack Query | Daftar produk, order, status fitur |
| **Client/UI State** (lokal, sementara) | React `useState`/`useReducer` (komponen kecil) atau **Zustand** (lintas komponen) | Modal terbuka, filter tabel, keranjang belanja (guest) |
| **Form State** | React Hook Form + Zod | Form create/edit produk, form checkout |

**Dilarang** menyimpan data server (hasil fetch API) di Zustand/Redux sebagai cache manual — itu tugas TanStack Query (auto caching, revalidation, invalidation).

## 13.2 TanStack Query — Konvensi

### Query Key Structure
```typescript
// packages/types atau lib/query-keys.ts per app
export const queryKeys = {
  products: {
    all: ['products'] as const,
    list: (filters: ProductFilters) => ['products', 'list', filters] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
  },
  orders: {
    all: ['orders'] as const,
    list: (filters: OrderFilters) => ['orders', 'list', filters] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
  },
  features: {
    all: ['features'] as const,           // status semua fitur untuk tenant aktif
  },
};
```

### Custom Hook Wajib per Resource
Jangan panggil `useQuery` langsung di komponen — bungkus dalam hook:
```typescript
// hooks/use-products.ts
export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: () => apiClient.get('/admin/products', { params: filters }),
    staleTime: 30_000,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) => apiClient.post('/admin/products', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}
```

### Aturan Invalidation
- Setiap mutation wajib meng-invalidate query key yang relevan (bukan `refetch` manual sporadis).
- Mutation yang mempengaruhi feature flag (`toggle feature`) wajib invalidate `queryKeys.features.all` agar sidebar & UI conditional rendering langsung update.

## 13.3 Hook Kunci: `useFeature`
Ini adalah hook paling penting di seluruh frontend — dipakai di admin panel **dan** storefront untuk conditional rendering berbasis feature flag.

```typescript
// hooks/use-feature.ts
export function useFeature(key: string): { isEnabled: boolean; isLoading: boolean; config?: Record<string, unknown> } {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.features.all,
    queryFn: () => apiClient.get('/admin/features'), // atau /storefront/store-info untuk storefront
    staleTime: 5 * 60_000, // 5 menit, selaras dengan cache Redis backend
  });

  const feature = data?.find((f) => f.key === key);
  return {
    isEnabled: feature?.isEnabled ?? false,
    isLoading,
    config: feature?.config,
  };
}
```

Penggunaan:
```tsx
function Sidebar() {
  const { isEnabled: hasMultiWarehouse } = useFeature('multi_warehouse');
  return (
    <nav>
      <SidebarItem href="/products">Produk</SidebarItem>
      {hasMultiWarehouse && <SidebarItem href="/warehouses">Gudang</SidebarItem>}
    </nav>
  );
}
```

**Penting**: `isLoading` wajib ditangani (tampilkan skeleton sidebar) — jangan biarkan flicker dari "hidden" ke "muncul" setelah data feature selesai load.

## 13.4 Zustand — Kapan Dipakai
Gunakan Zustand untuk state client yang **dibagi lintas komponen tapi bukan data server**, contoh:
- **Keranjang belanja guest** (storefront, sebelum checkout — disinkronkan ke backend saat checkout atau saat login).
- State UI kompleks admin panel: sidebar collapsed/expanded, filter aktif di halaman list yang perlu persist saat navigasi.

```typescript
// storefront: lib/store/cart-store.ts
interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: mergeCartItem(state.items, item) })),
  removeItem: (productId, variantId) =>
    set((state) => ({ items: state.items.filter((i) => !(i.productId === productId && i.variantId === variantId)) })),
  updateQuantity: (productId, quantity, variantId) =>
    set((state) => ({ items: updateCartItemQty(state.items, productId, quantity, variantId) })),
  clear: () => set({ items: [] }),
}));
```
Cart store **tidak** menyimpan harga final (harga selalu dihitung ulang dari server saat checkout, sesuai `12-workflows.md` §12.3) — hanya `productId`, `variantId`, `quantity` untuk menghindari client mempercayai harga cache lama.

**Dilarang** menggunakan `localStorage`/`sessionStorage` browser API secara langsung di dalam React state untuk lingkungan artifact/preview; namun untuk aplikasi produksi Next.js yang sebenarnya (bukan artifact chat), Zustand `persist` middleware ke `localStorage` **diperbolehkan** khusus untuk cart guest agar tidak hilang saat refresh.

## 13.5 Form State — React Hook Form + Zod
```typescript
const productSchema = z.object({
  name: z.string().min(3).max(150),
  basePrice: z.number().int().min(0),
  categoryId: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

function ProductForm() {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: '', basePrice: 0 },
  });
  const { mutate, isPending } = useCreateProduct();

  const onSubmit = (values: ProductFormValues) => mutate(values);
  // ...
}
```
Skema Zod ini idealnya di-generate/diselaraskan dengan DTO backend (`CreateProductDto`) — simpan constraint bersama (min/max length, dsb) di `packages/utils/constants` sebagai single source of truth (lihat `10-validation-rules.md`).

## 13.6 Context API — Kapan (Jarang) Dipakai
Gunakan React Context **hanya** untuk data yang benar-benar statis selama sesi dan jarang berubah, seperti:
- `TenantThemeContext` (storefront) — warna tema, logo, nama toko, di-set sekali di root layout dari data SSR.
- `CurrentUserContext` (admin panel) — data user login (id, role, name) hasil decode JWT/session.

**Jangan** gunakan Context untuk state yang sering berubah (list produk, filter, dll) — akan menyebabkan re-render berlebihan; gunakan TanStack Query atau Zustand.

## 13.7 Aturan Umum
1. Server state tidak boleh disalin manual ke `useState` lokal untuk "diedit" lalu di-sync balik — gunakan `useMutation` dengan optimistic update jika perlu UX instan.
2. Setiap fetch data untuk fitur yang bergantung pada feature flag wajib dibungkus kondisi `enabled: isFeatureEnabled` di opsi `useQuery` agar tidak melakukan request sia-sia ke endpoint yang akan mengembalikan `403 FEATURE_DISABLED`.
3. Loading state granular per section, bukan satu big spinner full page, khususnya di Dashboard admin yang menampilkan banyak data dari beberapa endpoint.
