'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { queryKeys } from '../lib/query-keys';
import { useTenantFeatures } from '../hooks/use-feature';
import {
  ShoppingBag,
  Receipt,
  Warehouse,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { data: features } = useTenantFeatures();

  const { data: productsData } = useQuery({
    queryKey: queryKeys.products.all,
    queryFn: async () => {
      const res: any = await apiClient.get('/admin/products');
      return res.data || res;
    },
  });

  const { data: ordersData } = useQuery({
    queryKey: queryKeys.orders.all,
    queryFn: async () => {
      const res: any = await apiClient.get('/admin/orders');
      return res.data || res;
    },
  });

  const activeFeaturesCount = features?.filter((f) => f.isEnabled).length || 0;
  const totalProducts = productsData?.meta?.total || productsData?.items?.length || 0;
  const pendingOrders = ordersData?.items?.filter((o: any) => o.status === 'PENDING_PAYMENT').length || 0;
  const paidOrders = ordersData?.items?.filter((o: any) => o.status === 'PAID' || o.status === 'COMPLETED').length || 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Dashboard Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
              Single-Tenant Scope Active
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Selamat Datang di Panel Admin Toko</h1>
          <p className="text-xs text-slate-300">
            Kelola operasional katalog, stok, dan pemrosesan transaksi toko UMKM Anda dari satu dashboard terpusat.
          </p>
        </div>

        <Link
          href="/features"
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-900/50 flex items-center gap-2 shrink-0"
        >
          <Zap className="w-4 h-4 text-emerald-200" />
          <span>Atur Fitur Toko ({activeFeaturesCount} Aktif)</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Produk</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalProducts}</h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Katalog Aktif</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Menunggu Bayar</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{pendingOrders}</h3>
            <p className="text-[11px] text-amber-600 font-medium mt-0.5">Perlu Dikonfirmasi</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Order Lunas / Selesai</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{paidOrders}</h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Siap Diproses</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Modul Fitur Aktif</p>
            <h3 className="text-2xl font-bold text-indigo-600 mt-1">{activeFeaturesCount}</h3>
            <p className="text-[11px] text-indigo-600 font-medium mt-0.5">Feature Flags</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Zap className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Access Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/products"
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all group space-y-2"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
              Kelola Produk & Varian
            </h3>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Tambah produk baru, atur harga dasar, upload gambar, dan kelola varian SKU.
          </p>
        </Link>

        <Link
          href="/orders"
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all group space-y-2"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
              Pemrosesan Order & Pembayaran
            </h3>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Konfirmasi pembayaran transfer manual dan perbarui status pengiriman barang.
          </p>
        </Link>

        <Link
          href="/features"
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all group space-y-2"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
              Toggle Feature Flags Toko
            </h3>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Aktifkan modul Varian, Multi-Gudang, atau Payment Gateway secara instan tanpa restart.
          </p>
        </Link>
      </div>
    </div>
  );
}
