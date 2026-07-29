'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Store, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'owner@toko-berkah.id',
      password: 'password123',
    },
  });

  const onSubmit = async (values: LoginValues) => {
    setIsLoading(true);
    try {
      const res: any = await apiClient.post('/auth/login', values);
      const data = res.data || res;

      if (data.accessToken) {
        localStorage.setItem('admin_token', data.accessToken);
        localStorage.setItem('admin_user', JSON.stringify(data.user || {}));
        if (data.user?.tenantId) {
          localStorage.setItem('admin_tenant_id', data.user.tenantId);
        }

        toast.success('Login Berhasil! Selamat datang di Panel Admin.');
        router.push('/');
      } else {
        toast.error('Gagal mengambil akses token dari server');
      }
    } catch (error: any) {
      toast.error(error.message || 'Email atau password salah');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl mx-auto shadow-lg shadow-emerald-600/30">
            <Store className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Masuk Panel Admin</h1>
          <p className="text-sm text-slate-500">Kelola katalog, order, dan fitur toko UMKM Anda</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Email Staf / Owner
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
              <input
                {...register('email')}
                type="email"
                placeholder="nama@tokoumkm.com"
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-500 mt-1 font-medium">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>
            {errors.password && (
              <p className="text-xs text-red-500 mt-1 font-medium">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <span>Masuk Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
          Atau gunakan kredensial demo default: <br />
          <code className="text-slate-600 font-mono">owner@toko-berkah.id / password123</code>
        </div>
      </div>
    </div>
  );
}
