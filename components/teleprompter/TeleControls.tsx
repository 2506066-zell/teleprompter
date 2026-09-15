'use client';

import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Maximize2,
  Minimize2,
  FlipHorizontal,
  Settings,
  Mic,
  Camera,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { PlaybackState, TeleprompterMode, TeleprompterSettings } from '@/types/teleprompter';

interface TeleControlsProps {
  playbackState: PlaybackState;
  settings: TeleprompterSettings;
  currentIndex: number;
  totalChunks: number;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onRestart: () => void;
  onUpdateSettings: (settings: Partial<TeleprompterSettings>) => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  voiceStatus: string;
  faceStatus: string;
}

export const TeleControls: React.FC<TeleControlsProps> = ({
  playbackState,
  settings,
  currentIndex,
  totalChunks,
  onTogglePlay,
  onNext,
  onPrev,
  onRestart,
  onUpdateSettings,
  onToggleFullscreen,
  isFullscreen,
  voiceStatus,
  faceStatus,
}) => {
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const isPlaying = playbackState === 'playing';

  const modes: { id: TeleprompterMode; label: string; desc: string }[] = [
    { id: 'adaptive', label: 'Adaptive', desc: 'AI Voice + Face + Auto-Pacing' },
    { id: 'voice_follow', label: 'Voice Follow', desc: 'Mengikuti ucapan suara' },
    { id: 'smart_pace', label: 'Smart Pace', desc: 'Otomatis berbasis durasi kata' },
    { id: 'manual', label: 'Manual', desc: 'Kontrol penuh tombol / sentuhan' },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 transition-all duration-300 pb-safe">
      {/* Settings Drawer Modal/Flyout */}
      {showSettingsDrawer && (
        <div className="bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800 p-4 sm:p-6 max-w-2xl mx-auto rounded-t-2xl shadow-2xl text-neutral-200">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-neutral-400">
              Pengaturan Teleprompter
            </h3>
            <button
              onClick={() => setShowSettingsDrawer(false)}
              className="text-xs px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition"
            >
              Tutup
            </button>
          </div>

          <div className="space-y-4">
            {/* Mode Selection */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-2">Mode Baca</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {modes.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onUpdateSettings({ mode: m.id })}
                    className={`px-3 py-2 text-xs rounded-lg font-medium transition text-left border ${
                      settings.mode === m.id
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-sm'
                        : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400 hover:border-neutral-600'
                    }`}
                  >
                    <div className="font-semibold">{m.label}</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5 line-clamp-1">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size & Speed Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-neutral-400">Ukuran Font</span>
                  <span className="font-mono text-white">{settings.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="22"
                  max="72"
                  step="2"
                  value={settings.fontSize}
                  onChange={(e) => onUpdateSettings({ fontSize: Number(e.target.value) })}
                  className="w-full accent-blue-500 bg-neutral-800 h-2 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-neutral-400">Kecepatan Pacing</span>
                  <span className="font-mono text-white">{settings.speedMultiplier.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={settings.speedMultiplier}
                  onChange={(e) => onUpdateSettings({ speedMultiplier: Number(e.target.value) })}
                  className="w-full accent-emerald-500 bg-neutral-800 h-2 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Mirror mode & Fullscreen toggles */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => onUpdateSettings({ mirrorMode: !settings.mirrorMode })}
                className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg font-medium border transition ${
                  settings.mirrorMode
                    ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
                }`}
              >
                <FlipHorizontal className="w-4 h-4" />
                Mirror Mode (Rig Kaca)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Control Bar */}
      <div className="max-w-xl mx-auto px-4 pb-4">
        <div
          className={`bg-neutral-900/90 backdrop-blur-md border border-neutral-800/80 rounded-2xl p-2.5 sm:p-3 shadow-2xl transition-all duration-300 ${
            isMinimized && isPlaying ? 'opacity-30 hover:opacity-100 scale-95' : 'opacity-100'
          }`}
        >
          <div className="flex items-center justify-between gap-1 sm:gap-2">
            {/* Collapse toggle */}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800/60 rounded-xl transition"
              title={isMinimized ? 'Perluas Kontrol' : 'Kecilkan Kontrol'}
            >
              {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Restart */}
            <button
              onClick={onRestart}
              className="p-2.5 text-neutral-400 hover:text-white hover:bg-neutral-800/60 rounded-xl transition"
              title="Mulai Ulang (Restart)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Prev Chunk */}
            <button
              onClick={onPrev}
              disabled={currentIndex <= 0}
              className="p-2.5 text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none rounded-xl transition"
              title="Chunk Sebelumnya (Panah Kiri)"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            {/* Play / Pause Primary Button */}
            <button
              onClick={onTogglePlay}
              className={`flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl transition-transform active:scale-95 shadow-lg ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
              }`}
              title={isPlaying ? 'Jeda (Spasi)' : 'Mulai Membaca (Spasi)'}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-0.5" />
              )}
            </button>

            {/* Next Chunk */}
            <button
              onClick={onNext}
              disabled={currentIndex >= totalChunks - 1}
              className="p-2.5 text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none rounded-xl transition"
              title="Chunk Berikutnya (Panah Kanan)"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            {/* Settings Toggle */}
            <button
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              className={`p-2.5 rounded-xl transition ${
                showSettingsDrawer
                  ? 'bg-blue-600/30 text-blue-400'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
              title="Pengaturan Teleprompter"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={onToggleFullscreen}
              className="p-2.5 text-neutral-400 hover:text-white hover:bg-neutral-800/60 rounded-xl transition"
              title={isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh (Fullscreen)'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="mt-2 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-500 font-mono px-1">
            <div className="flex items-center gap-2">
              <span className="capitalize text-neutral-400 font-medium">{settings.mode.replace('_', ' ')}</span>
              {settings.mirrorMode && <span className="text-purple-400 bg-purple-950/40 px-1 rounded">Mirror</span>}
            </div>
            <span>
              {totalChunks > 0 ? currentIndex + 1 : 0} / {totalChunks}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
