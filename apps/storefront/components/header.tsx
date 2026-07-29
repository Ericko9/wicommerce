'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { storefrontApiClient } from '../lib/api-client';
import { storefrontQueryKeys } from '../lib/query-keys';
import { ShoppingBag, Search, User, Store, ChevronRight } from 'lucide-react';

export function StorefrontHeader() {
  const [customer, setCustomer] = useState<any>(null);

  const { data: storeInfo } = useQuery({
    queryKey: storefrontQueryKeys.storeInfo,
    queryFn: async () => {
      const res: any = await storefrontApiClient.get('/storefront/store-info');
      return res.data || res;
    },
  });

  const { data: cartData } = useQuery({
    queryKey: storefrontQueryKeys.cart,
    queryFn: async () => {
      const res: any = await storefrontApiClient.get('/storefront/cart');
      return res.data || res;
    },
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedCustomer = localStorage.getItem('customer_user');
      if (storedCustomer) {
        try {
          setCustomer(JSON.parse(storedCustomer));
        } catch {}
      }
    }
  }, []);

  const totalCartQuantity = cartData?.totalQuantity || 0;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-600/30">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-base leading-tight">
              {storeInfo?.name || 'Toko UMKM'}
            </h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">Official Online Store</p>
          </div>
        </Link>

        {/* Action Buttons: Customer Auth & Cart */}
        <div className="flex items-center gap-3 shrink-0">
          {customer ? (
            <Link
              href="/account"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <User className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">{customer.name}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              Masuk
            </Link>
          )}

          <Link
            href="/cart"
            className="relative p-2 text-slate-700 hover:text-emerald-600 hover:bg-slate-50 rounded-xl transition-colors"
            title="Keranjang Belanja"
          >
            <ShoppingBag className="w-6 h-6" />
            {totalCartQuantity > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                {totalCartQuantity}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
