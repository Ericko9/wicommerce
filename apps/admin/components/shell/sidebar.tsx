'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Boxes,
  ShoppingBag,
  FolderTree,
  Warehouse,
  Receipt,
  Settings,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { useFeature } from '../../hooks/use-feature';

export function AdminSidebar() {
  const pathname = usePathname();

  // Progressive Complexity via useFeature hook
  const { isEnabled: hasVariants } = useFeature('product_variants');
  const { isEnabled: hasMultiWarehouse } = useFeature('multi_warehouse');

  const navItems = [
    {
      label: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      show: true,
    },
    {
      label: 'Manajemen Fitur',
      href: '/features',
      icon: Zap,
      badge: 'Utama',
      show: true,
    },
    {
      label: 'Katalog Produk',
      href: '/products',
      icon: ShoppingBag,
      show: true,
    },
    {
      label: 'Kategori',
      href: '/categories',
      icon: FolderTree,
      show: true,
    },
    {
      label: 'Stok & Gudang',
      href: '/inventory',
      icon: Warehouse,
      show: true,
    },
    {
      label: 'Pesanan (Order)',
      href: '/orders',
      icon: Receipt,
      show: true,
    },
    {
      label: 'Pengaturan Toko',
      href: '/settings',
      icon: Settings,
      show: true,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 min-h-screen flex flex-col border-r border-slate-800 shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-900/40">
          U
        </div>
        <div>
          <h1 className="font-bold text-base tracking-wide text-white leading-tight">UMKM Admin</h1>
          <p className="text-xs text-slate-400">Commerce Platform</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Menu Utama
        </div>
        {navItems
          .filter((item) => item.show)
          .map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-400 text-center">
        UMKM Commerce v1.0.0
      </div>
    </aside>
  );
}
