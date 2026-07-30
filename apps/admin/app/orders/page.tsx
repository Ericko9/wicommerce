'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { queryKeys } from '../../lib/query-keys';
import {
  Receipt,
  CheckCircle2,
  Clock,
  Truck,
  CheckCheck,
  XCircle,
  AlertOctagon,
  Eye,
  Loader2,
  DollarSign,
  User,
  MapPin,
  FileText,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const { data: ordersData, isLoading } = useQuery({
    queryKey: queryKeys.orders.list({ status: selectedStatus }),
    queryFn: async () => {
      const params: any = {};
      if (selectedStatus) params.status = selectedStatus;
      const res: any = await apiClient.get('/admin/orders', { params });
      return res.data || res;
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return apiClient.patch(`/admin/orders/${orderId}/confirm-payment`);
    },
    onSuccess: () => {
      toast.success('Pembayaran manual berhasil dikonfirmasi (Status -> PAID)!');
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      setSelectedOrder(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mengonfirmasi pembayaran');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return apiClient.patch(`/admin/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      toast.success('Status pesanan berhasil diperbarui!');
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      setSelectedOrder(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Perubahan status ditolak (validasi state machine)');
    },
  });

  const statusTabs = [
    { label: 'Semua Status', value: '' },
    { label: 'Menunggu Bayar', value: 'PENDING_PAYMENT' },
    { label: 'Sudah Bayar', value: 'PAID' },
    { label: 'Diproses', value: 'PROCESSING' },
    { label: 'Dikirim', value: 'SHIPPED' },
    { label: 'Selesai', value: 'COMPLETED' },
    { label: 'Batal', value: 'CANCELLED' },
    { label: 'Kedaluwarsa', value: 'EXPIRED' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-800 rounded-md flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Menunggu Bayar
          </span>
        );
      case 'PAID':
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-md flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Bayar
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-blue-100 text-blue-800 rounded-md flex items-center gap-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Diproses
          </span>
        );
      case 'SHIPPED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-indigo-100 text-indigo-800 rounded-md flex items-center gap-1">
            <Truck className="w-3.5 h-3.5" /> Dikirim
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-green-100 text-green-900 rounded-md flex items-center gap-1">
            <CheckCheck className="w-3.5 h-3.5" /> Selesai
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-red-100 text-red-800 rounded-md flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> Dibatalkan
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-slate-200 text-slate-700 rounded-md flex items-center gap-1">
            <AlertOctagon className="w-3.5 h-3.5" /> Kedaluwarsa
          </span>
        );
      default:
        return <span className="px-2 py-0.5 text-xs font-bold bg-slate-100">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Manajemen Pesanan (Order)</h1>
        <p className="text-sm text-slate-500">Kelola pemrosesan order, konfirmasi pembayaran manual, dan update pengiriman barang</p>
      </div>

      {/* Filter Status Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200 text-xs font-medium">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setSelectedStatus(tab.value)}
            className={`px-3.5 py-2 rounded-lg transition-all shrink-0 ${
              selectedStatus === tab.value
                ? 'bg-slate-900 text-white font-bold shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-2">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Memuat pesanan...</p>
          </div>
        ) : ordersData?.items?.length === 0 ? (
          <div className="text-center p-12 space-y-2 text-slate-500">
            <Receipt className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-semibold">Tidak Ada Pesanan</p>
            <p className="text-xs text-slate-400">Belum ada transaksi masuk untuk filter status ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">No. Order</th>
                  <th className="p-3.5">Pelanggan</th>
                  <th className="p-3.5">Metode Bayar</th>
                  <th className="p-3.5">Total Belanja</th>
                  <th className="p-3.5">Status Order</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ordersData?.items?.map((order: any) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5">
                      <span className="font-bold text-slate-900 font-mono text-sm block">
                        {order.orderNumber}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(order.createdAt).toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold text-slate-800 block">
                        {order.customerName || (typeof order.shippingAddress === 'object' ? order.shippingAddress?.recipient : 'Pelanggan')}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        {order.customerPhone || (typeof order.shippingAddress === 'object' ? order.shippingAddress?.phone : '-')}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-slate-700 uppercase font-mono">
                      {order.paymentMethod}
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 text-sm">
                      Rp {(order.totalAmount || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="p-3.5">{getStatusBadge(order.status)}</td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-3 py-1.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 ml-auto text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <span>Detail Pesanan:</span>
                  <span className="font-mono text-emerald-600">{selectedOrder.orderNumber}</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Dibuat pada {new Date(selectedOrder.createdAt).toLocaleString('id-ID')}
                </p>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer & Shipping Info */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs space-y-1 border border-slate-200">
              <div>
                <div className="flex items-center gap-1.5 text-slate-500 font-semibold mb-1">
                  <User className="w-3.5 h-3.5" /> Info Pelanggan
                </div>
                <p className="font-bold text-slate-900">
                  {selectedOrder.customerName || (typeof selectedOrder.shippingAddress === 'object' ? selectedOrder.shippingAddress?.recipient : 'Pelanggan')}
                </p>
                <p className="text-slate-600">
                  {selectedOrder.customerPhone || (typeof selectedOrder.shippingAddress === 'object' ? selectedOrder.shippingAddress?.phone : '-')}
                </p>
                <p className="text-slate-600">{selectedOrder.customerEmail || '-'}</p>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-slate-500 font-semibold mb-1">
                  <MapPin className="w-3.5 h-3.5" /> Alamat Pengiriman
                </div>
                <p className="text-slate-700 leading-relaxed">
                  {typeof selectedOrder.shippingAddress === 'object'
                    ? `${selectedOrder.shippingAddress?.fullAddress || ''}, ${selectedOrder.shippingAddress?.city || ''}, ${selectedOrder.shippingAddress?.province || ''} ${selectedOrder.shippingAddress?.postalCode || ''}`
                    : selectedOrder.shippingAddress || '-'}
                </p>
              </div>
            </div>

            {/* Purchased Items List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Daftar Barang Belanja
              </h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {selectedOrder.items?.map((item: any) => {
                  const price = item.priceSnapshot ?? item.price ?? 0;
                  const name = item.productNameSnapshot || item.productName || item.product?.name || 'Produk';
                  const subtotal = item.subtotal ?? (item.quantity * price);

                  return (
                    <div key={item.id} className="p-3 flex items-center justify-between text-xs bg-white">
                      <div>
                        <span className="font-bold text-slate-900 block">{name}</span>
                        <span className="text-slate-500">
                          {item.quantity} x Rp {price.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900">
                        Rp {subtotal.toLocaleString('id-ID')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total Amount Summary */}
            <div className="flex justify-between items-center bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-emerald-950 font-bold text-sm">
              <span>Total Tagihan Pesanan:</span>
              <span>Rp {selectedOrder.totalAmount.toLocaleString('id-ID')}</span>
            </div>

            {/* Action Buttons: Payment Confirm & State Machine Transitions */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              {selectedOrder.status === 'PENDING_PAYMENT' && (
                <button
                  type="button"
                  onClick={() => confirmPaymentMutation.mutate(selectedOrder.id)}
                  disabled={confirmPaymentMutation.isPending}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Konfirmasi Pembayaran Manual (Set ke PAID)</span>
                </button>
              )}

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-700 shrink-0">Ubah Status Order:</label>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      updateStatusMutation.mutate({
                        orderId: selectedOrder.id,
                        status: e.target.value,
                      });
                    }
                  }}
                  className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Pilih Status Berikutnya --</option>
                  <option value="PROCESSING">Diproses (PROCESSING)</option>
                  <option value="SHIPPED">Dikirim (SHIPPED)</option>
                  <option value="COMPLETED">Selesai (COMPLETED)</option>
                  <option value="CANCELLED">Dibatalkan (CANCELLED)</option>
                </select>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Tutup Detail
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
