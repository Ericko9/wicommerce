'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { queryKeys } from '../../lib/query-keys';
import { useFeature } from '../../hooks/use-feature';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  Layers,
  Edit,
  Trash2,
  Image as ImageIcon,
  Loader2,
  PackageCheck,
  PackageX,
  AlertTriangle,
  X,
  Tag,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { isEnabled: hasVariants } = useFeature('product_variants');

  // Form & Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deletingProduct, setDeletingProduct] = useState<any>(null);
  const [managingVariantsProduct, setManagingVariantsProduct] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: 0,
    status: 'ACTIVE',
    categoryId: '',
  });

  // Variant Form State inside Variant Modal
  const [variantForm, setVariantForm] = useState({
    name: '',
    sku: '',
    price: 15000,
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: queryKeys.products.list({ search, status: statusFilter, page }),
    queryFn: async () => {
      const params: any = { page, limit: 10 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res: any = await apiClient.get('/admin/products', { params });
      return res.data || res;
    },
  });

  const { data: categories } = useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: async () => {
      const res: any = await apiClient.get('/admin/categories');
      return res.data || res;
    },
  });

  // Query details for current managingVariantsProduct
  const { data: selectedProductDetails, refetch: refetchProductDetails } = useQuery({
    queryKey: ['product_details', managingVariantsProduct?.id],
    queryFn: async () => {
      if (!managingVariantsProduct?.id) return null;
      const res: any = await apiClient.get(`/admin/products/${managingVariantsProduct.id}`);
      return res.data || res;
    },
    enabled: !!managingVariantsProduct?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingProduct) {
        return apiClient.patch(`/admin/products/${editingProduct.id}`, payload);
      }
      return apiClient.post('/admin/products', payload);
    },
    onSuccess: () => {
      toast.success(editingProduct ? 'Produk berhasil diperbarui!' : 'Produk berhasil ditambahkan!');
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      handleCloseModal();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan produk');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/admin/products/${id}`);
    },
    onSuccess: () => {
      toast.success('Produk berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      setDeletingProduct(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menghapus produk');
    },
  });

  const addVariantMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post(`/admin/products/${managingVariantsProduct.id}/variants`, payload);
    },
    onSuccess: () => {
      toast.success('Varian produk baru berhasil ditambahkan!');
      refetchProductDetails();
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      setVariantForm({ name: '', sku: '', price: 15000 });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menambahkan varian produk');
    },
  });

  const deleteVariantMutation = useMutation({
    mutationFn: async (variantId: string) => {
      return apiClient.delete(`/admin/products/${managingVariantsProduct.id}/variants/${variantId}`);
    },
    onSuccess: () => {
      toast.success('Varian berhasil dihapus');
      refetchProductDetails();
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menghapus varian');
    },
  });

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      basePrice: 10000,
      status: 'ACTIVE',
      categoryId: categories?.[0]?.id || '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      basePrice: product.basePrice,
      status: product.status,
      categoryId: product.categoryId || '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      name: formData.name,
      description: formData.description,
      basePrice: Number(formData.basePrice),
      status: formData.status,
      categoryId: formData.categoryId || undefined,
    });
  };

  const handleAddVariantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addVariantMutation.mutate({
      name: variantForm.name,
      sku: variantForm.sku || `SKU-${Date.now()}`,
      price: Number(variantForm.price),
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Katalog Produk</h1>
          <p className="text-sm text-slate-500">Kelola daftar produk, harga, dan varian barang toko Anda</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md shadow-emerald-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Produk Baru</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama atau deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="">Semua Status</option>
            <option value="ACTIVE">Aktif (ACTIVE)</option>
            <option value="DRAFT">Draft (DRAFT)</option>
            <option value="ARCHIVED">Arsip (ARCHIVED)</option>
          </select>
        </div>
      </div>

      {/* Products List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Memuat katalog produk...</p>
          </div>
        ) : productsData?.items?.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
            <ShoppingBag className="w-12 h-12 text-slate-300" />
            <h3 className="text-base font-bold text-slate-800">
              {search ? 'Produk Tidak Ditemukan' : 'Belum Ada Produk'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm">
              {search
                ? `Tidak ada produk yang cocok dengan pencarian "${search}". Coba kata kunci lain.`
                : 'Toko Anda belum memiliki produk. Klik tombol di bawah untuk menambah produk pertama Anda.'}
            </p>
            {!search && (
              <button
                onClick={handleOpenCreate}
                className="text-xs font-semibold px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Tambah Produk Pertama
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Produk</th>
                  <th className="p-3.5">Kategori</th>
                  <th className="p-3.5">Harga Dasar</th>
                  <th className="p-3.5">Stok</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productsData?.items?.map((product: any) => {
                  const totalStock = product.inventoryItems?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0;

                  return (
                    <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                            {product.images?.[0]?.url ? (
                              <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-sm block">{product.name}</span>
                            <span className="text-[11px] text-slate-400 font-mono">Slug: {product.slug}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-medium text-slate-700">
                        {product.category?.name || '-'}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        Rp {product.basePrice.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5">
                        {totalStock > 0 ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                            <PackageCheck className="w-3.5 h-3.5" /> {totalStock} unit
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded text-[11px]">
                            <PackageX className="w-3.5 h-3.5" /> Habis
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase ${
                            product.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : product.status === 'DRAFT'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {product.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        {hasVariants && (
                          <button
                            onClick={() => setManagingVariantsProduct(product)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Kelola Varian & SKU"
                            aria-label="Kelola Varian & SKU"
                          >
                            <Layers className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(product)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Produk"
                          aria-label="Edit Produk"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingProduct(product)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus Produk"
                          aria-label="Hapus Produk"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nama Produk</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Misal: Kopi Susu Gula Aren 250ml"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Harga Dasar (Rp)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Kategori</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                    <option value="">-- Tanpa Kategori --</option>
                    {categories?.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Deskripsi Produk</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Penjelasan rincian rasa, kemasan, atau spesifikasi..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Status Publikasi</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                >
                  <option value="ACTIVE">ACTIVE (Tampil di Toko)</option>
                  <option value="DRAFT">DRAFT (Sembunyi)</option>
                  <option value="ARCHIVED">ARCHIVED (Arsip)</option>
                </select>
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
                  disabled={saveMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-colors shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                >
                  {saveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Variant & SKU Management Modal */}
      {managingVariantsProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-600" />
                  <span>Kelola Varian & SKU Produk</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Produk: <strong className="text-slate-900">{managingVariantsProduct.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setManagingVariantsProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List Existing Variants */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Daftar Varian Aktif
              </h4>

              {selectedProductDetails?.variants?.length === 0 ? (
                <div className="bg-slate-50 p-4 rounded-xl text-center text-xs text-slate-500 border border-slate-200">
                  Belum ada varian spesifik untuk produk ini.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  {selectedProductDetails?.variants?.map((v: any) => (
                    <div key={v.id} className="p-3 flex items-center justify-between text-xs bg-white">
                      <div>
                        <span className="font-bold text-slate-900 block">{v.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">SKU: {v.sku}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-slate-900">
                          {v.price ? `Rp ${v.price.toLocaleString('id-ID')}` : 'Harga Dasar'}
                        </span>
                        <button
                          onClick={() => deleteVariantMutation.mutate(v.id)}
                          disabled={deleteVariantMutation.isPending}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus Varian"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Variant Form */}
            <form onSubmit={handleAddVariantSubmit} className="space-y-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
              <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>Tambah Varian Baru</span>
              </h4>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Varian</label>
                  <input
                    type="text"
                    required
                    placeholder="Misal: Size L (500ml)"
                    value={variantForm.name}
                    onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode SKU</label>
                  <input
                    type="text"
                    placeholder="Auto / SKU-123"
                    value={variantForm.sku}
                    onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Harga (Rp)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={variantForm.price}
                    onChange={(e) => setVariantForm({ ...variantForm, price: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={addVariantMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                >
                  {addVariantMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Varian</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus Produk</h3>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus produk <strong className="text-slate-800">&quot;{deletingProduct.name}&quot;</strong>?
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deletingProduct.id)}
                className="px-4 py-2 text-xs font-semibold bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors shadow-md shadow-red-600/30 flex items-center gap-1.5"
              >
                {deleteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Ya, Hapus Produk</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
