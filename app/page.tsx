'use client';

import React from 'react';
import Link from 'next/link';
import { Play, Sparkles, Mic, Camera, Sliders, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col justify-between bg-neutral-950 text-neutral-100">
      {/* Top Navigation */}
      <header className="border-b border-neutral-900 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-black font-black text-base shadow-lg shadow-emerald-500/20">
            F
          </div>
          <span className="font-bold tracking-tight text-white text-lg">Focus Teleprompter</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white transition"
          >
            Masuk
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-white text-black font-semibold text-xs rounded-xl hover:bg-neutral-200 transition shadow-sm"
          >
            Buka App
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-16 sm:py-24 max-w-4xl mx-auto text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Adaptive AI Teleprompter v4</span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight mb-6">
          DON&apos;T MAKE HUMANS FOLLOW THE TELEPROMPTER.
          <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400">
            MAKE THE TELEPROMPTER FOLLOW HUMANS.
          </span>
        </h1>

        <p className="text-neutral-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-10">
          Teleprompter konvensional memaksa pembicara mengejar teks. Focus Teleprompter dirancang khusus untuk smartphone creator — teks beradaptasi secara real-time mengikuti intonasi, kecepatan bicara, dan atensi Anda.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm rounded-2xl transition shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            Mulai Buat Skrip
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/calibration"
            className="flex items-center gap-2 px-5 py-3.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 font-semibold text-sm rounded-2xl transition"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            Uji Sensor & Kalibrasi
          </Link>
        </div>
      </section>

      {/* 5 Core Systems Overview */}
      <section className="px-6 py-12 max-w-5xl mx-auto w-full border-t border-neutral-900">
        <h2 className="text-xs font-mono uppercase tracking-widest text-neutral-500 text-center mb-8">
          Arsitektur 5 Subsistem Adaptif
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80">
            <div className="p-2 w-fit rounded-xl bg-blue-500/10 text-blue-400 mb-3">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm mb-1">1. Smart Chunking</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Memotong teks berdasarkan batas tanda baca dan konjungsi alami Indonesia menjadi 5–12 kata yang nyaman dibaca tanpa terengah-engah.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80">
            <div className="p-2 w-fit rounded-xl bg-emerald-500/10 text-emerald-400 mb-3">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm mb-1">2. Auto-Pacing Engine</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Durasi baca dihitung secara dinamis dari WPM, bobot jeda tanda baca, dan skor kompleksitas kata.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80">
            <div className="p-2 w-fit rounded-xl bg-purple-500/10 text-purple-400 mb-3">
              <Mic className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm mb-1">3. Voice Tracking (Primary)</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Sliding-window fuzzy matching mencocokkan kata yang diucapkan. Aturan baku: <span className="text-white font-medium">Silence = HOLD</span> (tidak pernah melompat saat Anda diam).
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80">
            <div className="p-2 w-fit rounded-xl bg-amber-500/10 text-amber-400 mb-3">
              <Camera className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm mb-1">4. Face Tracking (Secondary)</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Mendeteksi atensi dan keberadaan wajah dengan grace period peredam kedipan. Otomatis hold/pause saat Anda berpaling dari kamera.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 sm:col-span-2 md:col-span-2">
            <div className="p-2 w-fit rounded-xl bg-teal-500/10 text-teal-400 mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm mb-1">5. Adaptive Decision Engine & Focus UI</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Mengorkestrasikan input sensorik dengan prioritas mutlak kontrol manual. Tampilan Focus Zone menyajikan teks aktif di visual center tanpa layout jump.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-900 py-6 px-6 text-center text-xs text-neutral-600">
        <p>Focus Teleprompter v4 — Built for mobile creators & privacy-first real-time interaction.</p>
      </footer>
    </main>
  );
}
