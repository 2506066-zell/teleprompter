'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { LogIn, UserPlus, AlertCircle, Info } from 'lucide-react';

interface AuthFormProps {
  mode: 'login' | 'signup';
}

export const AuthForm: React.FC<AuthFormProps> = ({ mode }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabaseConfigured = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    if (!supabaseConfigured) {
      // Offline / Local Demo mode
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'focus_tp_demo_user',
          JSON.stringify({
            id: 'demo-creator-user',
            email: email || 'creator@demo.local',
            full_name: fullName || 'Demo Creator',
          })
        );
      }
      setIsLoading(false);
      router.push(redirectTo);
      return;
    }

    const supabase = createClient();

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        if (error) throw error;
        router.push(redirectTo);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(redirectTo);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan autentikasi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-neutral-900/80 border border-neutral-800 rounded-2xl shadow-2xl backdrop-blur-md">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {mode === 'signup' ? 'Daftar Akun Baru' : 'Masuk ke Focus Teleprompter'}
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          {mode === 'signup'
            ? 'Mulai buat naskah yang mengikuti kecepatan bicaramu'
            : 'Akses seluruh project dan naskah teleprompter Anda'}
        </p>
      </div>

      {!supabaseConfigured && (
        <div className="mb-4 p-3 bg-blue-950/40 border border-blue-500/30 rounded-xl text-blue-200 text-xs flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <span>
            Mode Demo Aktif: Supabase environment belum disetel, Anda dapat langsung masuk untuk mencoba seluruh fitur.
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Nama Lengkap</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nama Anda"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition placeholder-neutral-600"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition placeholder-neutral-600"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition placeholder-neutral-600"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl transition shadow-lg shadow-blue-600/20 disabled:opacity-50"
        >
          {isLoading ? (
            'Memproses...'
          ) : mode === 'signup' ? (
            <>
              <UserPlus className="w-4 h-4" /> Daftar Sekarang
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" /> Masuk
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-neutral-800/80 text-center text-xs text-neutral-400">
        {mode === 'signup' ? (
          <p>
            Sudah memiliki akun?{' '}
            <a href="/login" className="text-blue-400 hover:underline font-semibold">
              Masuk di sini
            </a>
          </p>
        ) : (
          <p>
            Belum punya akun?{' '}
            <a href="/signup" className="text-blue-400 hover:underline font-semibold">
              Daftar gratis
            </a>
          </p>
        )}
      </div>
    </div>
  );
};
