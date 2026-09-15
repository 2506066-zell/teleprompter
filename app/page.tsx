'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Play, Mic, Eye, Sparkles, Check, ChevronRight } from 'lucide-react';

export default function HomePage() {
  const [activeWordIdx, setActiveWordIdx] = useState(1);

  // Subtle demo animation cycling words every 2 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveWordIdx((prev) => (prev >= 4 ? 0 : prev + 1));
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  const demoWords = [
    { text: 'Saya', isSpoken: true },
    { text: 'menggunakan', isSpoken: true },
    { text: 'teknologi AI', isSpecial: true },
    { text: 'untuk', isSpoken: false },
    { text: 'meningkatkan', isTarget: true },
  ];

  return (
    <main className="min-h-screen bg-[#0B0B0C] text-[#F5F5F5] font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* 1. Instrument Top Header */}
      <header className="border-b border-[#2A2A2A] px-5 py-4 sm:px-8 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
          <span className="font-semibold tracking-tight text-[#F5F5F5] text-sm">
            Focus Teleprompter
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1A1A1A] border border-[#2A2A2A] text-[#A3A3A3] hidden sm:inline-block">
            v4.0
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Link
            href="/calibration"
            className="text-[#A3A3A3] hover:text-[#F5F5F5] transition font-mono px-2 py-1"
          >
            Calibrate
          </Link>
          <Link
            href="/dashboard"
            className="px-3.5 py-1.5 bg-[#22C55E] hover:bg-[#16A34A] text-neutral-950 font-semibold rounded-xl transition shadow-sm"
          >
            Try the Instrument
          </Link>
        </div>
      </header>

      {/* 2. Hero Section: Tool-First Hierarchy */}
      <section className="px-5 pt-12 pb-16 sm:pt-20 sm:pb-24 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Product Value */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-emerald-400 font-mono text-[11px] tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
              Adaptive Reading Instrument
            </div>

            <h1 className="text-3xl sm:text-5xl font-medium text-[#F5F5F5] tracking-[-0.02em] leading-[1.18]">
              A teleprompter that follows your voice.
            </h1>

            <p className="text-[#A3A3A3] text-sm sm:text-base leading-relaxed max-w-xl">
              Conventional teleprompters force speakers to chase rigid auto-scrolling text. Focus Teleprompter positions your script near the smartphone lens and dynamically advances with your natural breath, thinking pauses, and speech articulation.
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#22C55E] hover:bg-[#16A34A] text-neutral-950 font-semibold text-xs rounded-xl transition active:scale-95 shadow-md shadow-emerald-950/30"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Try the Instrument
              </Link>

              <Link
                href="/calibration"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#1A1A1A] hover:bg-[#232323] text-[#A3A3A3] hover:text-[#F5F5F5] border border-[#2A2A2A] font-medium text-xs rounded-xl transition"
              >
                Calibrate Sensors
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Right Column: Live Interactive Instrument Simulator Demo */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-[340px] bg-[#111111] border border-[#2A2A2A] rounded-3xl p-4 shadow-2xl space-y-4">
              {/* Simulator Screen Top Bar */}
              <div className="flex items-center justify-between px-1 text-xs border-b border-[#2A2A2A] pb-2.5">
                <span className="font-medium text-[#A3A3A3] text-[11px]">Script 01</span>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                  VOICE FOLLOW
                </div>
              </div>

              {/* Reading Canvas Simulation */}
              <div className="py-5 px-2 text-center space-y-3">
                {/* Previous Context */}
                <p className="text-[#A3A3A3] text-xs opacity-65 line-clamp-1">
                  Halo teman-teman creator...
                </p>

                {/* Active Focus Zone with Dynamic Caption Word Follow */}
                <div className="p-3 bg-[#1A1A1A]/80 border border-[#2A2A2A] rounded-2xl space-y-2">
                  <div className="text-base font-medium text-[#F5F5F5] leading-snug flex flex-wrap justify-center gap-1.5">
                    {demoWords.map((item, idx) => {
                      const isActive = idx === activeWordIdx;
                      return (
                        <span
                          key={idx}
                          className={`transition-all duration-200 ${
                            isActive
                              ? 'text-emerald-400 bg-emerald-500/20 font-semibold px-1.5 py-0.5 rounded'
                              : item.isSpecial
                              ? 'text-emerald-300/90 border-b border-emerald-500/40'
                              : idx < activeWordIdx
                              ? 'text-[#F5F5F5]'
                              : 'text-[#A3A3A3] opacity-65'
                          }`}
                        >
                          {item.text}
                        </span>
                      );
                    })}
                  </div>

                  {/* Micro-Interruption Correction Pill Simulation */}
                  <div className="mt-2 pt-2 border-t border-[#2A2A2A]/80 flex items-center justify-between text-[10px] text-left">
                    <div className="flex items-center gap-1 text-emerald-400 font-mono">
                      <span className="w-1 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="w-1 h-3 bg-emerald-400 rounded-full" />
                      <span className="w-1 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="text-neutral-300 ml-1">Coba ulangi: <strong className="text-emerald-400">produktivitas</strong></span>
                    </div>
                    <span className="text-emerald-400 font-bold">✓</span>
                  </div>
                </div>

                {/* Upcoming Context */}
                <p className="text-[#A3A3A3] text-xs opacity-45 line-clamp-1">
                  untuk mahasiswa di era modern.
                </p>
              </div>

              {/* Compact Instrument Dock Simulator */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-2 flex items-center justify-between">
                <span className="p-1.5 text-[#6B7280]">
                  <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                </span>
                <div className="w-8 h-8 rounded-full bg-[#22C55E] flex items-center justify-center text-neutral-950 font-bold shadow">
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                </div>
                <span className="p-1.5 text-[#6B7280]">
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-center text-[10px] font-mono text-[#6B7280]">
                ● VOICE FOLLOW • 5 / 12
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Three Core Architectural Pillars (Behavior-Driven) */}
      <section className="px-5 py-14 max-w-5xl mx-auto w-full border-t border-[#2A2A2A] space-y-8">
        <div className="text-left space-y-1">
          <span className="text-xs font-mono uppercase text-emerald-400 tracking-wider">Ergonomic Architecture</span>
          <h2 className="text-xl sm:text-2xl font-medium text-[#F5F5F5]">
            Engineered for genuine human speech.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Camera Proximity */}
          <div className="p-5 bg-[#111111] border border-[#2A2A2A] rounded-2xl space-y-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-[#F5F5F5]">Camera-Proximity Fixation</h3>
            <p className="text-xs text-[#A3A3A3] leading-relaxed">
              Text is anchored near the top of your smartphone screen right by the camera lens, maintaining genuine eye contact without looking like you are reading.
            </p>
          </div>

          {/* Card 2: Silence is HOLD */}
          <div className="p-5 bg-[#111111] border border-[#2A2A2A] rounded-2xl space-y-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-[#F5F5F5]">Voice-Following Engine</h3>
            <p className="text-xs text-[#A3A3A3] leading-relaxed">
              Zero frantic scrolling. When you pause to think or breathe, the teleprompter holds calmly. When you speak, the dynamic caption highlights progress smoothly.
            </p>
          </div>

          {/* Card 3: Pronunciation Aware */}
          <div className="p-5 bg-[#111111] border border-[#2A2A2A] rounded-2xl space-y-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Check className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-[#F5F5F5]">Pronunciation-Aware</h3>
            <p className="text-xs text-[#A3A3A3] leading-relaxed">
              Non-dogmatic phonetic analysis tailored for Indonesian speech. Understands common phonetic variations without punishing natural accents.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Minimal Instrument Footer */}
      <footer className="border-t border-[#2A2A2A] py-6 px-5 text-center text-xs font-mono text-[#6B7280] max-w-5xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>Focus Teleprompter v4.0</span>
        <span>Designed for spoken language & camera eye-contact</span>
      </footer>
    </main>
  );
}
