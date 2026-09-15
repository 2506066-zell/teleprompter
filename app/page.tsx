'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Play } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col justify-between bg-[#050505] text-neutral-100 antialiased selection:bg-neutral-800">
      {/* Top Header */}
      <header className="border-b border-neutral-900 px-6 py-5 flex items-center justify-between max-w-4xl mx-auto w-full">
        <span className="font-medium tracking-tight text-neutral-200 text-sm">
          Focus Teleprompter
        </span>
        <div className="flex items-center gap-4 text-xs">
          <Link
            href="/calibration"
            className="text-neutral-500 hover:text-neutral-300 transition font-mono"
          >
            Kalibrasi
          </Link>
          <Link
            href="/dashboard"
            className="px-3.5 py-1.5 bg-neutral-100 text-neutral-950 font-medium rounded-full hover:bg-white transition"
          >
            Buka Instrumen
          </Link>
        </div>
      </header>

      {/* Main Hero & Philosophy */}
      <section className="px-6 py-20 sm:py-28 max-w-3xl mx-auto w-full">
        <div className="space-y-6">
          <p className="text-xs font-mono tracking-widest uppercase text-neutral-500">
            Cognitive Reading Instrument
          </p>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-normal text-white tracking-tight leading-[1.25]">
            Don&apos;t make humans follow the teleprompter.
            <br />
            <span className="text-neutral-400">
              Make the teleprompter follow humans.
            </span>
          </h1>

          <p className="text-neutral-400 text-sm sm:text-base leading-relaxed max-w-xl">
            Teleprompter konvensional memaksa manusia mengejar kecepatan mesin. Focus Teleprompter adalah instrumen baca adaptif untuk kreator smartphone—teks beradaptasi dengan ritme napas, jeda berpikir, dan kontak mata Anda dengan lensa kamera.
          </p>

          <div className="pt-4 flex items-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-100 hover:bg-white text-neutral-950 font-medium text-xs rounded-full transition active:scale-95 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Mulai Membaca
            </Link>

            <Link
              href="/calibration"
              className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition font-mono"
            >
              Uji Sensor
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Cognitive Principles List */}
      <section className="px-6 py-16 max-w-3xl mx-auto w-full border-t border-neutral-900 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs leading-relaxed">
          <div className="space-y-2">
            <h2 className="font-medium text-white tracking-tight">Camera-Proximity Fixation Zone</h2>
            <p className="text-neutral-500">
              Teks aktif diposisikan mendekati bibir atas smartphone dekat lensa kamera, menjaga kontak mata Anda dengan penonton tanpa terlihat sedang membaca.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-medium text-white tracking-tight">Silence is HOLD</h2>
            <p className="text-neutral-500">
              Ketika Anda berhenti sejenak untuk bernapas atau berpikir, teleprompter tidak akan melompat maju. Teks tetap tenang di posisi yang sama.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-medium text-white tracking-tight">Spoken Rhythm Chunking</h2>
            <p className="text-neutral-500">
              Naskah dipecah menurut batas konjungsi alami dan tanda jeda bahasa Indonesia, membentuk unit bacaan 5–12 kata yang nyaman diucapkan dalam satu hembusan napas.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-medium text-white tracking-tight">Zero Visual Chrome</h2>
            <p className="text-neutral-500">
              Saat sesi membaca dimulai, seluruh tombol dan status otomatis menghilang ke dalam kegelapan. Hanya ada Anda, suara Anda, dan baris kalimat aktif.
            </p>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="border-t border-neutral-900 py-6 px-6 text-center text-[11px] font-mono text-neutral-600">
        Focus Teleprompter v4 — Designed for spoken language and natural human gaze.
      </footer>
    </main>
  );
}
