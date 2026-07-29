'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { queryKeys } from '../../lib/query-keys';
import { Warehouse, SlidersHorizontal, PackageCheck, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function InventoryPage() {
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    productId: '',
    variantId: '',
    type: 'IN',
    quantity: 1,
    note: '',
  });

  const { data: inventoryItems, isLoading } = useQuery({
    queryKey: queryKeys.inventory.all,
    queryFn: async () => {
      const res: any = await apiClient.get('/admin/inventory');
      return res.data || res;
    },
  });

  const { data: productsData } = useQuery({
    queryKey: queryKeys.products.all,
    queryFn: async () => {
      const res: any = await apiClient.get('/admin/products');
      return res.data || res;
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/admin/inventory/adjust', payload);
    },
    onSuccess: () => {
      toast.success('Penyesuaian stok berhasil disimpan!');
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      handleCloseModal();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyesuaikan stok');
    },
  });

  const handleOpenAdjust = (item?: any) => {
    if (item) {
      setSelectedItem(item);
      setFormData({
        productId: item.productId,
        variantId: item.variantId || '',
        type: 'IN',
        quantity: 1,
        note: '',
      });
    } else {
      setSelectedItem(null);
      setFormData({
        productId: productsData?.items?.[0]?.id || '',
        variantId: '',
        type: 'IN',
        quantity: 1,
        note: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    adjustMutation.mutate({
      productId: formData.productId,
      variantId: formData.variantId || undefined,
      type: formData.type,
      quantity: Number(formData.quantity),
      note: formData.note,
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Stok & Gudang</h1>
          <p className="text-sm text-slate-500">Pantau ketersediaan stok fisik barang di Gudang Utama toko</p>
        </div>

        <button
          onClick={() => handleOpenAdjust()}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md shadow-emerald-600/30"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Penyesuaian Stok</span>
        </button>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-2">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-500">Memuat data stok gudang...</p>
          </div>
        ) : inventoryItems?.length === 0 ? (
          <div className="text-center p-12 space-y-2 text-slate-500">
            <Warehouse className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-semibold">Belum Ada Data Stok</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Produk</th>
                <th className="p-3.5">Varian</th>
                <th className="p-3.5">Gudang</th>
                <th className="p-3.5">Jumlah Stok</th>
                <th className="p-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventoryItems?.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3.5 font-bold text-slate-900">
                    {item.product?.name || 'Produk'}
                  </td>
                  <td className="p-3.5 text-slate-600">
                    {item.variant?.name ? (
                      <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-800 rounded">
                        {item.variant.name} (SKU: {item.variant.sku})
                      </span>
                    ) : (
                      <span className="text-slate-400 font-italic">- Single Product -</span>
                    )}
                  </td>
                  <td className="p-3.5 text-slate-600 font-medium">
                    {item.warehouse?.name || 'Gudang Utama'}
                  </td>
                  <td className="p-3.5 font-bold text-slate-900">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${
                        item.quantity > 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      {item.quantity} unit
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => handleOpenAdjust(item)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors text-xs"
                    >
                      Sesuaikan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Adjust Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Penyesuaian Stok Gudang</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Pilih Produk</label>
                <select
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                >
                  {productsData?.items?.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Tipe Penyesuaian</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-bold"
                  >
                    <option value="IN">IN (Tambah Stok)</option>
                    <option value="OUT">OUT (Kurang Stok)</option>
                    <option value="SET">SET (Atur Ulang)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Jumlah Unit</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Catatan Staf (Optional)</label>
                <input
                  type="text"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Misal: Restok barang datang dari supplier"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={adjustMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-colors shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                >
                  {adjustMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Stok</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
