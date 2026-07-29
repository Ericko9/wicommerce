'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storefrontApiClient } from '../../../lib/api-client';
import { storefrontQueryKeys } from '../../../lib/query-keys';
import { ShoppingBag, ArrowLeft, Plus, Minus, Check, PackageCheck, PackageX, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const slug = params?.slug as string;

  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: storefrontQueryKeys.products.detail(slug),
    queryFn: async () => {
      const res: any = await storefrontApiClient.get(`/storefront/products/${slug}`);
      return res.data || res;
    },
  });

  const addToCartMutation = useMutation({
    mutationFn: async (payload: any) => {
      return storefrontApiClient.post('/storefront/cart/items', payload);
    },
    onSuccess: () => {
      toast.success('Produk berhasil ditambahkan ke keranjang!');
      queryClient.invalidateQueries({ queryKey: storefrontQueryKeys.cart });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menambahkan produk ke keranjang');
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Memuat rincian produk...</p>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center space-y-4 max-w-md mx-auto my-12 border border-slate-200">
        <PackageX className="w-12 h-12 text-slate-300 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Produk Tidak Ditemukan</h2>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-emerald-600 text-white font-semibold text-xs rounded-xl"
        >
          Kembali ke Katalog Home
        </button>
      </div>
    );
  }

  const effectivePrice = selectedVariant?.price ?? product.basePrice;
  const isOutOfStock = product.stockStatus === 'OUT_OF_STOCK';

  const handleAddToCart = () => {
    addToCartMutation.mutate({
      productId: product.id,
      variantId: selectedVariant?.id || undefined,
      quantity,
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali</span>
      </button>

      {/* Main Product Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
        {/* Images Gallery */}
        <div className="space-y-4">
          <div className="w-full aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative">
            {product.images?.[activeImageIndex]?.url ? (
              <img
                src={product.images[activeImageIndex].url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <ImageIcon className="w-16 h-16" />
              </div>
            )}
          </div>

          {/* Thumbnails list */}
          {product.images?.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto">
              {product.images.map((img: any, idx: number) => (
                <button
                  key={img.id || idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                    activeImageIndex === idx ? 'border-emerald-600 scale-95' : 'border-slate-200 opacity-70'
                  }`}
                >
                  <img src={img.url} alt="thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details & Purchase Form */}
        <div className="space-y-6 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="px-3 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-full inline-block">
              {product.category?.name || 'Katalog Store'}
            </span>

            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
              {product.name}
            </h1>

            {/* Stock Status Badge */}
            <div className="flex items-center gap-2">
              {!isOutOfStock ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  <PackageCheck className="w-4 h-4" /> Stok Tersedia ({product.totalStock} unit)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-lg">
                  <PackageX className="w-4 h-4" /> Stok Habis
                </span>
              )}
            </div>

            {/* Price Header */}
            <div className="pt-2">
              <span className="text-xs text-slate-400 font-medium block">Harga</span>
              <div className="text-3xl font-extrabold text-slate-900">
                Rp {effectivePrice.toLocaleString('id-ID')}
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
                <p>{product.description}</p>
              </div>
            )}

            {/* Variant Selector (if product has variants) */}
            {product.variants?.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Pilih Varian Produk:
                </label>

                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v: any) => {
                    const isSelected = selectedVariant?.id === v.id;
                    const variantPrice = v.price !== null ? v.price : product.basePrice;

                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariant(isSelected ? null : v)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/30'
                            : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span>{v.name}</span>
                        <span className="font-bold font-mono">
                          (Rp {variantPrice.toLocaleString('id-ID')})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quantity Selector & Add to Cart CTA */}
          <div className="space-y-4 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">Jumlah Pembelian</span>
              <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-lg bg-white text-slate-700 font-bold flex items-center justify-center shadow-sm hover:bg-slate-50"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-bold text-slate-900 w-6 text-center">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-8 h-8 rounded-lg bg-white text-slate-700 font-bold flex items-center justify-center shadow-sm hover:bg-slate-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock || addToCartMutation.isPending}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addToCartMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menambahkan...</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-5 h-5" />
                  <span>Tambah ke Keranjang</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
