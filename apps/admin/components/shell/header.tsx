'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Store, User, ShieldCheck } from 'lucide-react';
import { apiClient } from '../../lib/api-client';

export function AdminHeader() {
  const router = useRouter();
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('admin_user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {}
      }
    }

    apiClient
      .get('/storefront/store-info')
      .then((res: any) => setStoreInfo(res.data || res))
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    router.push('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm">
      {/* Active Tenant Information */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
          <Store className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-800 text-sm">
              {storeInfo?.name || 'Toko UMKM Aktif'}
            </h2>
            <span className="px-2 py-0.5 text-[11px] font-medium bg-emerald-100 text-emerald-800 rounded-full">
              Tenant Active
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {storeInfo?.subdomain ? `${storeInfo.subdomain}.ucp.local` : 'Loading tenant info...'}
          </p>
        </div>
      </div>

      {/* User Session & Logout */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          <User className="w-4 h-4 text-slate-500" />
          <span className="font-medium text-slate-900">{user?.name || 'Staff Admin'}</span>
          <span className="text-xs bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono uppercase">
            {user?.role || 'OWNER'}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
          title="Keluar dari sesi admin"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar</span>
        </button>
      </div>
    </header>
  );
}
