'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mic, Camera, CheckCircle2, AlertCircle, Info, Sparkles, Sliders } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useFaceTracking } from '@/hooks/useFaceTracking';
import { createReadingChunks } from '@/lib/script/chunking';
import { matchTranscriptToChunks } from '@/lib/tracking/fuzzyMatch';

const TEST_SCRIPT = "Halo nama saya creator. Saya sedang mencoba kalibrasi suara dan wajah.";

export default function CalibrationPage() {
  const testChunks = createReadingChunks(TEST_SCRIPT, 'portrait');
  const [activeChunkIndex, setActiveChunkIndex] = useState(0);

  const voice = useSpeechRecognition({
    chunks: testChunks,
    currentChunkIndex: activeChunkIndex,
    onMatch: (matchedIdx) => {
      setActiveChunkIndex(matchedIdx);
    },
  });

  const face = useFaceTracking({ enabled: false });
  const [faceActive, setFaceActive] = useState(false);

  const handleToggleFace = () => {
    if (faceActive) {
      face.stopTracking();
      setFaceActive(false);
    } else {
      face.startTracking();
      setFaceActive(true);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Kalibrasi Sensor & Tracking</h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Uji coba mikrofon dan kamera Anda sebelum sesi rekaman
            </p>
          </div>
        </div>
      </div>

      {/* Overview Card */}
      <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-2xl text-xs text-neutral-300 leading-relaxed flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-white mb-1">Prinsip Privacy-First & Tanpa Rekaman Cloud</p>
          <p>
            Semua proses pengenalan suara dan wajah berjalan 100% lokal di browser Anda. Tidak ada audio atau video yang dikirim ke server cloud atau disimpan secara permanen.
          </p>
        </div>
      </div>

      {/* Grid of Tests: Voice & Face */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Voice Tracking Calibration */}
        <div className="p-5 bg-neutral-900/80 border border-neutral-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Uji Suara (Voice Follow)</h2>
                <p className="text-[11px] text-neutral-400">Web Speech API & Fuzzy Match</p>
              </div>
            </div>

            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                voice.status === 'speaking'
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-400'
                  : voice.status === 'silence'
                  ? 'bg-amber-950/80 border-amber-500/60 text-amber-300'
                  : voice.status === 'listening'
                  ? 'bg-sky-950/80 border-sky-500/60 text-sky-400'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400'
              }`}
            >
              Status: {voice.status.toUpperCase()}
            </span>
          </div>

          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
            <p className="text-xs text-neutral-400">Ucapkan kalimat uji coba berikut:</p>
            <p className="text-sm font-semibold text-white bg-neutral-900 p-2.5 rounded-lg border border-neutral-800/80">
              &ldquo;{TEST_SCRIPT}&rdquo;
            </p>
          </div>

          {voice.transcript && (
            <div className="p-3 bg-neutral-950/90 border border-blue-500/30 rounded-xl">
              <span className="text-[10px] font-mono text-blue-400 block mb-1">
                Transkrip Terdeteksi:
              </span>
              <p className="text-xs text-neutral-200">{voice.transcript}</p>
              {voice.confidence > 0 && (
                <span className="text-[10px] text-emerald-400 block mt-1">
                  Confidence Score: {(voice.confidence * 100).toFixed(0)}%
                </span>
              )}
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={voice.toggleListening}
              className={`w-full py-2.5 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-2 ${
                voice.status !== 'off'
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/10'
              }`}
            >
              <Mic className="w-4 h-4" />
              {voice.status !== 'off' ? 'Hentikan Mikrofon' : 'Mulai Uji Mikrofon'}
            </button>
          </div>
        </div>

        {/* 2. Face Tracking Calibration */}
        <div className="p-5 bg-neutral-900/80 border border-neutral-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Uji Wajah (Face Tracking)</h2>
                <p className="text-[11px] text-neutral-400">Atensi & Grace Period (1.8s)</p>
              </div>
            </div>

            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                face.status === 'active'
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-400'
                  : face.status === 'thinking'
                  ? 'bg-amber-950/80 border-amber-500/60 text-amber-300'
                  : face.status === 'away'
                  ? 'bg-rose-950/80 border-rose-500/60 text-rose-300'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400'
              }`}
            >
              Status: {face.status.toUpperCase()}
            </span>
          </div>

          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2 text-xs text-neutral-300">
            <p>
              Uji coba bagaimana sistem merespons ketika Anda berpaling dari kamera:
            </p>
            <ul className="space-y-1 text-neutral-400 list-disc list-inside">
              <li>Menghadap kamera $\to$ Status <span className="text-emerald-400">ACTIVE</span></li>
              <li>Menutup kamera / berpaling $\to$ Toleransi jeda <span className="text-amber-400">THINKING</span></li>
              <li>Hilang lebih dari 1.8 detik $\to$ <span className="text-rose-400">AWAY (Otomatis Pause)</span></li>
            </ul>
          </div>

          <div className="pt-2">
            <button
              onClick={handleToggleFace}
              className={`w-full py-2.5 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-2 ${
                faceActive
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                  : 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/10'
              }`}
            >
              <Camera className="w-4 h-4" />
              {faceActive ? 'Hentikan Kamera' : 'Mulai Uji Kamera'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
