'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storefrontApiClient } from '../../lib/api-client';
import { storefrontQueryKeys } from '../../lib/query-keys';
import { ShoppingBag, ArrowRight, Trash2, Plus, Minus, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function CartPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: cartData, isLoading } = useQuery({
    queryKey: storefrontQueryKeys.cart,
    queryFn: async () => {
      const res: any = await storefrontApiClient.get('/storefront/cart');
      return res.data || res;
    },
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ productId, variantId, quantity }: { productId: string; variantId?: string; quantity: number }) => {
      const params = variantId ? { variantId } : {};
      return storefrontApiClient.patch(`/storefront/cart/items/${productId}`, { quantity }, { params });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storefrontQueryKeys.cart });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mengubah jumlah');
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async ({ productId, variantId }: { productId: string; variantId?: string }) => {
      const params = variantId ? { variantId } : {};
      return storefrontApiClient.delete(`/storefront/cart/items/${productId}`, { params });
    },
    onSuccess: () => {
      toast.success('Item berhasil dihapus dari keranjang');
      queryClient.invalidateQueries({ queryKey: storefrontQueryKeys.cart });
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Memuat keranjang belanja...</p>
      </div>
    );
  }

  const items = cartData?.items || [];
  const subtotal = cartData?.subtotal || 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Lanjut Belanja</span>
      </button>

      <div className="border-b border-slate-200 pb-3">
        <h1 className="text-2xl font-bold text-slate-900">Keranjang Belanja Anda</h1>
        <p className="text-xs text-slate-500">Periksa daftar item sebelum melanjutkan ke proses checkout</p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center space-y-4 border border-slate-200 max-w-md mx-auto">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Keranjang Masih Kosong</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Anda belum menambahkan item ke keranjang belanja. Jelajahi katalog produk kami sekarang.
          </p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/30 hover:bg-emerald-700 transition-colors"
          >
            Mulai Belanja
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-3">
            {items.map((item: any, idx: number) => (
              <div
                key={`${item.productId}-${item.variantId || idx}`}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm truncate">{item.name}</h3>
                    <p className="text-xs text-slate-500">
                      Rp {item.price.toLocaleString('id-ID')}
                    </p>
                    <p className="text-xs font-bold text-emerald-600 mt-0.5">
                      Subtotal: Rp {item.subtotal.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                {/* Quantity Controls & Remove */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      onClick={() =>
                        updateQuantityMutation.mutate({
                          productId: item.productId,
                          variantId: item.variantId,
                          quantity: item.quantity - 1,
                        })
                      }
                      className="w-7 h-7 rounded-lg bg-white text-slate-700 font-bold flex items-center justify-center shadow-sm hover:bg-slate-50 text-xs"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold text-slate-900 w-5 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantityMutation.mutate({
                          productId: item.productId,
                          variantId: item.variantId,
                          quantity: item.quantity + 1,
                        })
                      }
                      className="w-7 h-7 rounded-lg bg-white text-slate-700 font-bold flex items-center justify-center shadow-sm hover:bg-slate-50 text-xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    onClick={() =>
                      removeItemMutation.mutate({
                        productId: item.productId,
                        variantId: item.variantId,
                      })
                    }
                    className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                    title="Hapus item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Checkout Summary Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 h-fit">
            <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3">
              Ringkasan Belanja
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Item:</span>
                <span className="font-bold text-slate-900">{cartData?.totalQuantity || 0} barang</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-2 border-t border-slate-100 text-sm font-extrabold text-slate-900">
                <span>Subtotal:</span>
                <span>Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
            >
              <span>Lanjut ke Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
