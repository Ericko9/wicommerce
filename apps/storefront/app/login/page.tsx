'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Store, Lock, Mail, ArrowRight, Loader2, UserPlus } from 'lucide-react';
import { storefrontApiClient } from '../../lib/api-client';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function CustomerLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginValues) => {
    setIsLoading(true);
    try {
      const res: any = await storefrontApiClient.post('/storefront/auth/login', values);
      const data = res.data || res;
      const accessToken = data.tokens?.accessToken || data.accessToken;
      const user = data.user || {};

      if (accessToken) {
        localStorage.setItem('customer_token', accessToken);
        localStorage.setItem('customer_user', JSON.stringify(user));

        toast.success(`Selamat datang kembali, ${user.name || 'Pelanggan'}!`);
        window.location.href = '/';
      } else {
        toast.error('Gagal mengambil token otentikasi dari server');
      }
    } catch (error: any) {
      toast.error(error.message || 'Email atau kata sandi salah');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl mx-auto shadow-lg shadow-emerald-600/30">
            <Store className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Masuk Akun Pelanggan</h1>
          <p className="text-xs text-slate-500">Masuk untuk kemudahan transaksi dan melacak pesanan Anda</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Email Pelanggan
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
              <input
                {...register('email')}
                type="email"
                placeholder="nama@email.com"
                className="w-full pl-11 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>
            {errors.email && (
              <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>
            {errors.password && (
              <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses Login...</span>
              </>
            ) : (
              <>
                <span>Masuk Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <span>Belum memiliki akun pelanggan?</span>
          <Link href="/register" className="font-bold text-emerald-600 hover:underline inline-flex items-center gap-1">
            <UserPlus className="w-3.5 h-3.5" />
            <span>Daftar Sekarang</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
