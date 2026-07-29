'use client';

import React from 'react';
import { Store, ShieldCheck, Truck, Headphones } from 'lucide-react';

export function StorefrontFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-8 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Pembayaran Aman</h4>
              <p className="text-slate-400 text-xs">Mendukung Transfer Bank, COD, Midtrans & Xendit</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Pengiriman Cepat</h4>
              <p className="text-slate-400 text-xs">Dikirim langsung dari Gudang Utama Toko</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Layanan Pelanggan</h4>
              <p className="text-slate-400 text-xs">Responsif via WhatsApp & Chat Online</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p>© 2026 Platform E-Commerce UMKM. Powered by Modular Architecture.</p>
          <div className="flex items-center gap-4">
            <span>Privasi</span>
            <span>Syarat & Ketentuan</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
