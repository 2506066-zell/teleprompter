'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { AuthForm } from '@/components/auth/AuthForm';
import { ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-neutral-950">
      <div className="w-full max-w-md mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-neutral-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
        </Link>
      </div>

      <Suspense fallback={<div className="text-white text-xs">Memuat...</div>}>
        <AuthForm mode="login" />
      </Suspense>
    </main>
  );
}
