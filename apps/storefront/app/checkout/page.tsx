'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storefrontApiClient } from '../../lib/api-client';
import { storefrontQueryKeys } from '../../lib/query-keys';
import { ShieldCheck, CreditCard, Truck, User, MapPin, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function CheckoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    customerName: 'Budi Santoso',
    customerPhone: '081234567890',
    customerEmail: 'budi@gmail.com',
    shippingAddress: 'Jl. Merdeka No. 45, Jakarta Selatan',
    paymentMethod: 'manual_transfer',
  });

  const { data: cartData, isLoading: isCartLoading } = useQuery({
    queryKey: storefrontQueryKeys.cart,
    queryFn: async () => {
      const res: any = await storefrontApiClient.get('/storefront/cart');
      return res.data || res;
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (payload: any) => {
      return storefrontApiClient.post('/storefront/checkout', payload);
    },
    onSuccess: (res: any) => {
      const data = res.data || res;
      toast.success('Order berhasil dibuat!');
      queryClient.invalidateQueries({ queryKey: storefrontQueryKeys.cart });

      // Save order response locally and redirect to order detail page
      if (data.order?.id) {
        localStorage.setItem(`order_${data.order.id}`, JSON.stringify(data));
        router.push(`/orders/${data.order.id}`);
      } else {
        router.push('/');
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal memproses checkout');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const items = cartData?.items || [];
    if (items.length === 0) {
      toast.error('Keranjang belanja kosong!');
      return;
    }

    const payload = {
      shippingAddress: {
        recipient: formData.customerName,
        phone: formData.customerPhone,
        fullAddress: formData.shippingAddress,
        city: 'Jakarta Pusat',
        province: 'DKI Jakarta',
        postalCode: '10110',
      },
      paymentMethod: formData.paymentMethod,
      items: items.map((i: any) => ({
        productId: i.productId,
        variantId: i.variantId || undefined,
        quantity: i.quantity,
      })),
      cartId: 'guest-session',
    };

    checkoutMutation.mutate(payload);
  };

  if (isCartLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Memuat alur checkout...</p>
      </div>
    );
  }

  const items = cartData?.items || [];
  const subtotal = cartData?.subtotal || 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Keranjang</span>
      </button>

      <div className="border-b border-slate-200 pb-3">
        <h1 className="text-2xl font-bold text-slate-900">Checkout Pembelian</h1>
        <p className="text-xs text-slate-500">Lengkapi data pengiriman dan pilih metode pembayaran</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Step 1 & Step 2 Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Informasi Pelanggan */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-slate-900 font-bold text-sm">
              <User className="w-4 h-4 text-emerald-600" />
              <h2>1. Informasi Penerima</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="Nama Pembeli"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">No. WhatsApp / HP</label>
                  <input
                    type="text"
                    required
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    placeholder="0812xxxx"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Email (Opsional)</label>
                  <input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    placeholder="email@gmail.com"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Alamat Pengiriman */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-slate-900 font-bold text-sm">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <h2>2. Alamat Pengiriman</h2>
            </div>

            <div className="text-xs">
              <label className="block font-semibold text-slate-700 uppercase mb-1">Alamat Lengkap</label>
              <textarea
                rows={3}
                required
                value={formData.shippingAddress}
                onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                placeholder="Nama jalan, nomor rumah, RT/RW, Kecamatan, Kota/Kabupaten, Kode Pos..."
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Step 3: Metode Pembayaran */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-slate-900 font-bold text-sm">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <h2>3. Pilih Metode Pembayaran</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                  formData.paymentMethod === 'manual_transfer'
                    ? 'border-emerald-600 bg-emerald-50/50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="manual_transfer"
                  checked={formData.paymentMethod === 'manual_transfer'}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-900 block text-sm">Transfer Bank Manual</span>
                  <span className="text-slate-500 text-[11px]">BCA 123-456-7890 a.n Toko UMKM</span>
                </div>
              </label>

              <label
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                  formData.paymentMethod === 'cod'
                    ? 'border-emerald-600 bg-emerald-50/50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={formData.paymentMethod === 'cod'}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-900 block text-sm">Bayar di Tempat (COD)</span>
                  <span className="text-slate-500 text-[11px]">Bayar tunai saat kurir datang</span>
                </div>
              </label>

              <label
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                  formData.paymentMethod === 'midtrans'
                    ? 'border-emerald-600 bg-emerald-50/50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="midtrans"
                  checked={formData.paymentMethod === 'midtrans'}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-900 block text-sm">Midtrans Online Payment</span>
                  <span className="text-slate-500 text-[11px]">QRIS, GoPay, OVO, Virtual Account</span>
                </div>
              </label>

              <label
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                  formData.paymentMethod === 'xendit'
                    ? 'border-emerald-600 bg-emerald-50/50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="xendit"
                  checked={formData.paymentMethod === 'xendit'}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-900 block text-sm">Xendit Invoice</span>
                  <span className="text-slate-500 text-[11px]">Kartu Kredit, VA, Convenience Store</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Order Summary & Submit Button */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 h-fit">
          <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3">
            Ringkasan Item Belanja
          </h3>

          <div className="divide-y divide-slate-100 text-xs max-h-48 overflow-y-auto">
            {items.map((item: any, idx: number) => (
              <div key={idx} className="py-2 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-800 block truncate">{item.name}</span>
                  <span className="text-slate-400">
                    {item.quantity} x Rp {item.price.toLocaleString('id-ID')}
                  </span>
                </div>
                <span className="font-bold text-slate-900">
                  Rp {item.subtotal.toLocaleString('id-ID')}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Biaya Pengiriman:</span>
              <span className="font-bold text-emerald-600">GRATIS (Promo)</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-100">
              <span>Total Bayar:</span>
              <span>Rp {subtotal.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={checkoutMutation.isPending || items.length === 0}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {checkoutMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses Pesanan...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Buat Pesanan Sekarang</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
