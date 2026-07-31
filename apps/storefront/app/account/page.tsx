'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { storefrontApiClient } from '../../lib/api-client';
import { storefrontQueryKeys } from '../../lib/query-keys';
import { User, Mail, Phone, LogOut, Package, ArrowRight, Clock, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerAccountPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('customer_user');
      if (stored) {
        try {
          setCustomer(JSON.parse(stored));
        } catch {}
      } else {
        router.push('/login');
      }
    }
  }, [router]);

  const { data: myOrders, isLoading } = useQuery({
    queryKey: storefrontQueryKeys.myOrders,
    queryFn: async () => {
      const res: any = await storefrontApiClient.get('/storefront/orders');
      return res.data || res;
    },
    enabled: !!customer,
  });

  const handleLogout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_user');
    toast.success('Berhasil keluar dari akun pelanggan');
    window.location.href = '/login';
  };

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Memuat profil pelanggan...</p>
      </div>
    );
  }

  const ordersList = Array.isArray(myOrders) ? myOrders : myOrders?.items || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Katalog Home</span>
      </button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Akun Pelanggan Saya</h1>
          <p className="text-xs text-slate-500">Kelola informasi diri dan lacak riwayat belanja Anda</p>
        </div>

        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar Akun</span>
        </button>
      </div>

      {/* Customer Information Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xl">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">{customer.name}</h2>
            <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-md inline-block mt-0.5">
              Pelanggan Terdaftar
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Email: <strong className="text-slate-900">{customer.email}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            <span>No. WhatsApp: <strong className="text-slate-900">{customer.phone || customer.customerPhone || '-'}</strong></span>
          </div>
        </div>
      </div>

      {/* Order History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            <span>Riwayat Pesanan Saya</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Total {ordersList.length} Transaksi
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-2">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-500">Memuat riwayat pesanan...</p>
          </div>
        ) : ordersList.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center space-y-3 border border-slate-200">
            <Package className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">Belum Ada Riwayat Pesanan</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Anda belum melakukan pemesanan produk. Temukan produk impian Anda dan lakukan belanja sekarang.
            </p>
            <Link
              href="/"
              className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/30 hover:bg-emerald-700 transition-colors"
            >
              Belanja Sekarang
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {ordersList.map((ord: any) => (
              <div
                key={ord.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 font-mono text-sm">
                      {ord.orderNumber}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase bg-emerald-100 text-emerald-800">
                      {ord.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Dibuat pada {new Date(ord.createdAt).toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs font-bold text-slate-900 pt-1">
                    Total: Rp {ord.totalAmount?.toLocaleString('id-ID')}
                  </p>
                </div>

                <Link
                  href={`/orders/${ord.id}`}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <span>Detail & Pembayaran</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
