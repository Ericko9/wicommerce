'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { queryKeys } from '../../lib/query-keys';
import { Settings, CreditCard, ShieldCheck, Key, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: storeInfo, isLoading } = useQuery({
    queryKey: queryKeys.settings.tenant,
    queryFn: async () => {
      const res: any = await apiClient.get('/storefront/store-info');
      return res.data || res;
    },
  });

  const [midtransConfig, setMidtransConfig] = useState({
    merchantId: 'M123456',
    serverKey: 'SB-Mid-server-xxxx',
    clientKey: 'SB-Mid-client-yyyy',
    isProduction: false,
  });

  const [xenditConfig, setXenditConfig] = useState({
    secretKey: 'xnd_development_xxxx',
    webhookVerificationToken: 'wh_token_yyyy',
    isProduction: false,
  });

  const midtransMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.patch('/admin/payments/config/payment_midtrans', payload);
    },
    onSuccess: () => {
      toast.success('Kredensial Midtrans berhasil disimpan & dienkripsi AES-256!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan kredensial Midtrans');
    },
  });

  const xenditMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.patch('/admin/payments/config/payment_xendit', payload);
    },
    onSuccess: () => {
      toast.success('Kredensial Xendit berhasil disimpan & dienkripsi AES-256!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan kredensial Xendit');
    },
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan Toko & Payment Gateway</h1>
        <p className="text-sm text-slate-500">Kelola profil identitas toko dan integrasi kredensial pembayaran online (AES-256 Encrypted)</p>
      </div>

      {/* Store Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Settings className="w-5 h-5 text-emerald-600" />
          <h2 className="font-bold text-slate-900 text-base">Profil Identitas Toko</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-slate-500 py-4">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Memuat informasi toko...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-500 uppercase mb-1">Nama Toko</label>
              <input
                type="text"
                disabled
                value={storeInfo?.name || 'Toko UMKM'}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-500 uppercase mb-1">Subdomain</label>
              <input
                type="text"
                disabled
                value={`${storeInfo?.subdomain || 'demo'}.ucp.local`}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-mono text-slate-700"
              />
            </div>
          </div>
        )}
      </div>

      {/* Midtrans Config Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="font-bold text-slate-900 text-base">Konfigurasi Payment Gateway Midtrans</h2>
              <p className="text-xs text-slate-500">API Key dienkripsi secara aman menggunakan AES-256-GCM at-rest</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> AES-256 Encrypted
          </span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            midtransMutation.mutate(midtransConfig);
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-semibold text-slate-700 uppercase mb-1">Merchant ID</label>
            <input
              type="text"
              required
              value={midtransConfig.merchantId}
              onChange={(e) => setMidtransConfig({ ...midtransConfig, merchantId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">Server Key</label>
              <input
                type="password"
                required
                value={midtransConfig.serverKey}
                onChange={(e) => setMidtransConfig({ ...midtransConfig, serverKey: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">Client Key</label>
              <input
                type="text"
                required
                value={midtransConfig.clientKey}
                onChange={(e) => setMidtransConfig({ ...midtransConfig, clientKey: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={midtransConfig.isProduction}
                onChange={(e) => setMidtransConfig({ ...midtransConfig, isProduction: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="font-semibold text-slate-700">Mode Production (App Midtrans)</span>
            </label>

            <button
              type="submit"
              disabled={midtransMutation.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-md shadow-blue-600/30 flex items-center gap-1.5"
            >
              {midtransMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Simpan Midtrans</span>
            </button>
          </div>
        </form>
      </div>

      {/* Xendit Config Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="font-bold text-slate-900 text-base">Konfigurasi Payment Gateway Xendit</h2>
              <p className="text-xs text-slate-500">API Key dienkripsi secara aman menggunakan AES-256-GCM at-rest</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-800 rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> AES-256 Encrypted
          </span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            xenditMutation.mutate(xenditConfig);
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-semibold text-slate-700 uppercase mb-1">Secret Key</label>
            <input
              type="password"
              required
              value={xenditConfig.secretKey}
              onChange={(e) => setXenditConfig({ ...xenditConfig, secretKey: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase mb-1">Webhook Verification Token</label>
            <input
              type="text"
              required
              value={xenditConfig.webhookVerificationToken}
              onChange={(e) => setXenditConfig({ ...xenditConfig, webhookVerificationToken: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={xenditConfig.isProduction}
                onChange={(e) => setXenditConfig({ ...xenditConfig, isProduction: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-semibold text-slate-700">Mode Production (Xendit Dashboard)</span>
            </label>

            <button
              type="submit"
              disabled={xenditMutation.isPending}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
            >
              {xenditMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Simpan Xendit</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
