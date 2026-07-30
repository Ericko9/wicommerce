'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { storefrontApiClient } from '../../../lib/api-client';
import { storefrontQueryKeys } from '../../../lib/query-keys';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Copy,
  ArrowLeft,
  Receipt,
  MapPin,
  CreditCard,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [localOrderData, setLocalOrderData] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      const stored = localStorage.getItem(`order_${id}`);
      if (stored) {
        try {
          setLocalOrderData(JSON.parse(stored));
        } catch {}
      }
    }
  }, [id]);

  const order = localOrderData?.order;
  const paymentInstructions = localOrderData?.paymentInstructions;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Nomor rekening berhasil disalin!');
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16">
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Halaman Utama Store</span>
      </button>

      {/* Success Notification Banner */}
      <div className="bg-emerald-600 text-white rounded-3xl p-8 text-center space-y-3 shadow-xl shadow-emerald-950/20">
        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold">Pesanan Berhasil Dibuat!</h1>
        <p className="text-xs text-emerald-100 font-mono">
          Nomor Pesanan: <strong className="text-white font-bold">{order?.orderNumber || id}</strong>
        </p>
      </div>

      {/* Payment Instructions Card */}
      {paymentInstructions && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-slate-900 font-bold text-sm">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            <h2>Instruksi Pembayaran</h2>
          </div>

          {order?.paymentMethod === 'manual_transfer' && (
            <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl space-y-3 text-xs text-amber-950">
              <div className="flex items-center gap-2 text-amber-800 font-bold">
                <Clock className="w-4 h-4" />
                <span>Transfer Sebelum Batas Waktu Pembayaran</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Bank BCA</span>
                  <span className="text-base font-extrabold text-slate-900 font-mono">123-456-7890</span>
                  <span className="text-[11px] text-slate-500 block">a.n Toko UMKM Platform</span>
                </div>
                <button
                  onClick={() => copyToClipboard('1234567890')}
                  className="px-3 py-1.5 bg-amber-100 text-amber-900 hover:bg-amber-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin</span>
                </button>
              </div>

              <div className="flex justify-between items-center pt-2 font-bold text-sm">
                <span>Total Nominal Transfer:</span>
                <span className="text-emerald-700">
                  Rp {(paymentInstructions.amount || order?.totalAmount)?.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          )}

          {order?.paymentMethod === 'midtrans' && (
            <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl space-y-3 text-xs text-blue-950">
              <p className="font-semibold">
                Selesaikan pembayaran online Anda via Midtrans Snap Portal:
              </p>
              {paymentInstructions.redirectUrl && (
                <a
                  href={paymentInstructions.redirectUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/30"
                >
                  <span>Buka Portal Bayar Midtrans</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          {order?.paymentMethod === 'xendit' && (
            <div className="bg-indigo-50 border border-indigo-200 p-5 rounded-2xl space-y-3 text-xs text-indigo-950">
              <p className="font-semibold">Selesaikan pembayaran online Anda via Xendit Invoice Portal:</p>
              {paymentInstructions.invoiceUrl && (
                <a
                  href={paymentInstructions.invoiceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/30"
                >
                  <span>Buka Invoice Xendit</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          {order?.paymentMethod === 'cod' && (
            <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl text-xs text-emerald-950 space-y-1">
              <p className="font-bold text-sm text-emerald-900">Pembayaran di Tempat (COD)</p>
              <p className="text-slate-600">
                Pesanan Anda akan segera diproses oleh staf toko dan dikirimkan oleh kurir. Siapkan uang tunai pas sebesar{' '}
                <strong className="text-slate-900">Rp {order?.totalAmount?.toLocaleString('id-ID')}</strong> saat kurir menyerahkan paket.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Rincian Order Card */}
      {order && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 text-xs">
          <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3">
            Rincian Pengiriman & Pemesan
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-slate-400 block mb-0.5">Penerima:</span>
              <p className="font-bold text-slate-900">
                {order.customerName || (typeof order.shippingAddress === 'object' ? order.shippingAddress?.recipient : 'Pelanggan')}
              </p>
              <p className="text-slate-600">
                {order.customerPhone || (typeof order.shippingAddress === 'object' ? order.shippingAddress?.phone : '-')}
              </p>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Alamat Pengiriman:</span>
              <p className="text-slate-700 font-medium leading-relaxed">
                {typeof order.shippingAddress === 'object'
                  ? `${order.shippingAddress?.fullAddress || ''}, ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.province || ''} ${order.shippingAddress?.postalCode || ''}`
                  : order.shippingAddress || '-'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
