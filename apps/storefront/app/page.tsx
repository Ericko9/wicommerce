'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { storefrontApiClient } from '../lib/api-client';
import { storefrontQueryKeys } from '../lib/query-keys';
import { Search, ShoppingBag, ArrowRight, PackageCheck, PackageX, Image as ImageIcon, Loader2 } from 'lucide-react';

export default function StorefrontHomePage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);

  const { data: categories } = useQuery({
    queryKey: storefrontQueryKeys.categories,
    queryFn: async () => {
      const res: any = await storefrontApiClient.get('/storefront/categories');
      return res.data || res;
    },
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: storefrontQueryKeys.products.list({ search, categoryId: selectedCategory, page }),
    queryFn: async () => {
      const params: any = { page, limit: 12 };
      if (search) params.search = search;
      if (selectedCategory) params.categoryId = selectedCategory;
      const res: any = await storefrontApiClient.get('/storefront/products', { params });
      return res.data || res;
    },
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Storefront Banner */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900 text-white rounded-3xl p-8 md:p-12 shadow-xl shadow-emerald-950/20 relative overflow-hidden">
        <div className="max-w-xl space-y-3 relative z-10">
          <span className="px-3 py-1 text-xs font-bold bg-white/20 backdrop-blur-md rounded-full text-emerald-100 uppercase tracking-wider inline-block">
            Official Storefront
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
            Produk Pilihan Terbaik Langsung Dari Toko
          </h1>
          <p className="text-sm text-emerald-100 leading-relaxed">
            Temukan aneka produk lokal berkualitas dengan harga terbaik, jaminan transaksi aman, dan pengiriman langsung ke alamat Anda.
          </p>
        </div>
      </div>

      {/* Search & Category Filter Section */}
      <div className="space-y-4">
        <div className="relative max-w-lg mx-auto">
          <Search className="w-5 h-5 absolute left-4 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Cari produk impian Anda di sini..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 text-sm bg-white border border-slate-300 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shrink-0 ${
              selectedCategory === ''
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Semua Produk
          </button>
          {categories?.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-lg font-bold text-slate-900">Daftar Katalog Produk</h2>
          <span className="text-xs text-slate-500 font-medium">
            Total {productsData?.meta?.total || productsData?.items?.length || 0} Produk
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Memuat katalog toko...</p>
          </div>
        ) : productsData?.items?.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">Tidak Ada Produk Ditemukan</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Maaf, tidak ada produk yang cocok dengan kata kunci pencarian atau kategori yang dipilih.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {productsData?.items?.map((product: any) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-emerald-400 transition-all duration-300 flex flex-col group"
              >
                {/* Product Thumbnail Image */}
                <div className="w-full aspect-square bg-slate-100 relative overflow-hidden">
                  {product.images?.[0]?.url ? (
                    <img
                      src={product.images[0].url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ImageIcon className="w-10 h-10" />
                    </div>
                  )}

                  <div className="absolute top-2.5 right-2.5">
                    {product.stockStatus === 'IN_STOCK' ? (
                      <span className="px-2 py-1 text-[10px] font-bold bg-emerald-600/90 backdrop-blur-md text-white rounded-lg shadow-sm flex items-center gap-1">
                        <PackageCheck className="w-3 h-3" /> Stok Ada
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-[10px] font-bold bg-red-600/90 backdrop-blur-md text-white rounded-lg shadow-sm flex items-center gap-1">
                        <PackageX className="w-3 h-3" /> Habis
                      </span>
                    )}
                  </div>
                </div>

                {/* Product Content Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
                      {product.category?.name || 'Katalog Store'}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-2 group-hover:text-emerald-700 transition-colors">
                      {product.name}
                    </h3>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">Harga</span>
                      <span className="text-base font-extrabold text-slate-900">
                        Rp {product.basePrice.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white text-slate-600 flex items-center justify-center transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
