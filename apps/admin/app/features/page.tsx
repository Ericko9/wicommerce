'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { queryKeys } from '../../lib/query-keys';
import { useTenantFeatures } from '../../hooks/use-feature';
import { Zap, CheckCircle, Lock, AlertTriangle, ShieldCheck, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function FeaturesPage() {
  const queryClient = useQueryClient();
  const { data: features, isLoading, isError } = useTenantFeatures();
  const [selectedFeature, setSelectedFeature] = useState<any>(null);

  const toggleMutation = useMutation({
    mutationFn: async ({ key, isEnabled }: { key: string; isEnabled: boolean }) => {
      return apiClient.patch(`/admin/features/${key}/toggle`, { isEnabled });
    },
    onSuccess: (_, variables) => {
      toast.success(
        `Fitur '${variables.key}' berhasil ${variables.isEnabled ? 'diaktifkan' : 'dinonaktifkan'}.`,
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.features.all });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mengubah status fitur');
    },
  });

  const handleToggle = (feature: any) => {
    if (feature.isCore) {
      toast.info('Fitur inti platform (Core Feature) selalu aktif dan tidak dapat dinonaktifkan.');
      return;
    }

    if (feature.isEnabled) {
      // Show confirmation dialog before disabling feature with dependencies
      setSelectedFeature(feature);
    } else {
      toggleMutation.mutate({ key: feature.key, isEnabled: true });
    }
  };

  const confirmDisable = () => {
    if (selectedFeature) {
      toggleMutation.mutate({ key: selectedFeature.key, isEnabled: false });
      setSelectedFeature(null);
    }
  };

  // Group features by category
  const categories = Array.from(new Set(features?.map((f) => f.category) || []));

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Manajemen Fitur Platform</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full">
              Modular Commerce
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Aktifkan atau nonaktifkan modul bisnis toko secara fleksibel. Fitur yang dinonaktifkan akan disembunyikan dari antarmuka toko tanpa menghapus data.
          </p>
        </div>

        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.features.all })}
          className="flex items-center gap-2 text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Segarkan Data</span>
        </button>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Memuat fitur toko...</p>
        </div>
      )}

      {isError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          Gagal mengambil data fitur. Pastikan backend API berjalan dan Anda sudah login.
        </div>
      )}

      {/* Feature Groups */}
      {categories.map((category) => {
        const categoryFeatures = features?.filter((f) => f.category === category) || [];

        return (
          <div key={category} className="space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
              Kategori: {category}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryFeatures.map((feat) => {
                return (
                  <div
                    key={feat.key}
                    className={`p-5 rounded-xl border transition-all flex flex-col justify-between space-y-4 ${
                      feat.isEnabled
                        ? 'bg-white border-slate-200 shadow-sm hover:border-emerald-300'
                        : 'bg-slate-50 border-slate-200 opacity-75'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-base">{feat.name}</h3>
                          {feat.isCore ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-700 rounded-md flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-slate-600" /> Wajib (Core)
                            </span>
                          ) : feat.isEnabled ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-md">
                              Aktif
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-600 rounded-md">
                              Nonaktif
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {feat.description || `Modul ${feat.name} untuk platform ecommerce.`}
                        </p>
                      </div>

                      {/* Toggle Switch */}
                      {!feat.isCore && (
                        <button
                          type="button"
                          onClick={() => handleToggle(feat)}
                          disabled={toggleMutation.isPending}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            feat.isEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              feat.isEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-mono">
                      <span>Key: {feat.key}</span>
                      {feat.isCore && <span className="text-slate-400 font-sans italic">Always Active</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Confirmation Modal when disabling feature */}
      {selectedFeature && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Konfirmasi Menonaktifkan Fitur</h3>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menonaktifkan fitur <strong className="text-slate-900">"{selectedFeature.name}"</strong>?
              <br />
              Menu dan antarmuka terkait fitur ini akan disembunyikan dari aplikasi toko. Data histori tidak akan dihapus.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedFeature(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDisable}
                className="px-4 py-2 text-xs font-semibold bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors shadow-md shadow-red-600/30"
              >
                Ya, Nonaktifkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
