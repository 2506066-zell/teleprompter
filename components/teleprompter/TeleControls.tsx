'use client';

import React, { useState } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  FlipHorizontal,
  Maximize2,
  Minimize2,
  Sliders,
  Eye,
  Camera,
} from 'lucide-react';
import { PlaybackState, TeleprompterMode, TeleprompterSettings, FocusPosition } from '@/types/teleprompter';

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
  visible?: boolean;
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
  visible = true,
}) => {
  const [showDrawer, setShowDrawer] = useState(false);
  const isPlaying = playbackState === 'playing';

  const modes: { id: TeleprompterMode; label: string }[] = [
    { id: 'adaptive', label: 'Adaptive' },
    { id: 'voice_follow', label: 'Voice' },
    { id: 'smart_pace', label: 'Pacing' },
    { id: 'manual', label: 'Manual' },
  ];

  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-40 transition-all duration-300 pointer-events-auto pb-safe ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
      }`}
    >
      {/* Settings Drawer */}
      {showDrawer && (
        <div className="bg-neutral-950/95 border-t border-neutral-800/80 p-5 max-w-lg mx-auto rounded-t-2xl shadow-2xl backdrop-blur-md text-neutral-300 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-900">
            <span className="text-xs font-mono uppercase tracking-widest text-neutral-400">
              Instrumen Kalibrasi
            </span>
            <button
              onClick={() => setShowDrawer(false)}
              className="text-xs px-2.5 py-1 text-neutral-400 hover:text-white bg-neutral-900 rounded-lg transition"
            >
              Tutup
            </button>
          </div>

          {/* Mode Selector */}
          <div>
            <span className="block text-[11px] text-neutral-400 font-mono mb-2 uppercase">Mode Adaptif</span>
            <div className="grid grid-cols-4 gap-1.5 bg-neutral-900 p-1 rounded-xl">
              {modes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onUpdateSettings({ mode: m.id })}
                  className={`py-1.5 text-xs rounded-lg font-medium transition ${
                    settings.mode === m.id
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Camera Gaze Proximity Calibration */}
          <div>
            <span className="block text-[11px] text-neutral-400 font-mono mb-2 uppercase">Posisi Fiksasi (Jarak Lensa Kamera)</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdateSettings({ focusPosition: 'lens_proximity' })}
                className={`flex items-center justify-center gap-2 py-2 px-3 text-xs rounded-xl border transition ${
                  settings.focusPosition === 'lens_proximity'
                    ? 'bg-neutral-800 border-neutral-600 text-white'
                    : 'border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                Dekat Kamera (Atas)
              </button>
              <button
                onClick={() => onUpdateSettings({ focusPosition: 'center' })}
                className={`flex items-center justify-center gap-2 py-2 px-3 text-xs rounded-xl border transition ${
                  settings.focusPosition === 'center'
                    ? 'bg-neutral-800 border-neutral-600 text-white'
                    : 'border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Tengah Layar
              </button>
            </div>
          </div>

          {/* Font Size & Speed Sliders */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <div className="flex justify-between text-xs mb-1 text-neutral-400 font-mono">
                <span>Ukuran Font</span>
                <span className="text-white">{settings.fontSize}px</span>
              </div>
              <input
                type="range"
                min="24"
                max="72"
                step="2"
                value={settings.fontSize}
                onChange={(e) => onUpdateSettings({ fontSize: Number(e.target.value) })}
                className="w-full accent-neutral-200 bg-neutral-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1 text-neutral-400 font-mono">
                <span>Tempo</span>
                <span className="text-white">{settings.speedMultiplier.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={settings.speedMultiplier}
                onChange={(e) => onUpdateSettings({ speedMultiplier: Number(e.target.value) })}
                className="w-full accent-neutral-200 bg-neutral-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Mirror Mode (Beam Splitter Glass) */}
          <div className="pt-2 border-t border-neutral-900 flex items-center justify-between">
            <span className="text-xs text-neutral-400">Mirror Horizontal (Rig Kaca)</span>
            <button
              onClick={() => onUpdateSettings({ mirrorMode: !settings.mirrorMode })}
              className={`p-1.5 rounded-lg border transition ${
                settings.mirrorMode
                  ? 'bg-neutral-800 border-neutral-600 text-white'
                  : 'border-neutral-800 text-neutral-500'
              }`}
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Ambient Minimal Bottom Bar */}
      <div className="max-w-md mx-auto px-4 pb-4">
        <div className="bg-neutral-950/90 border border-neutral-800/60 rounded-full px-4 py-2 shadow-2xl backdrop-blur-md flex items-center justify-between">
          {/* Restart */}
          <button
            onClick={onRestart}
            className="p-2 text-neutral-400 hover:text-white rounded-full transition"
            title="Mulai Ulang (Restart)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Previous Chunk */}
          <button
            onClick={onPrev}
            disabled={currentIndex <= 0}
            className="p-2 text-neutral-300 hover:text-white disabled:opacity-20 rounded-full transition"
            title="Kalimat Sebelumnya"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Primary Play / Pause Toggle */}
          <button
            onClick={onTogglePlay}
            className="w-11 h-11 rounded-full bg-neutral-100 hover:bg-white text-neutral-950 flex items-center justify-center shadow-lg transition active:scale-95"
            title={isPlaying ? 'Jeda' : 'Mulai Membaca'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {/* Next Chunk */}
          <button
            onClick={onNext}
            disabled={currentIndex >= totalChunks - 1}
            className="p-2 text-neutral-300 hover:text-white disabled:opacity-20 rounded-full transition"
            title="Kalimat Berikutnya"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Settings Drawer Button */}
          <button
            onClick={() => setShowDrawer(!showDrawer)}
            className={`p-2 rounded-full transition ${
              showDrawer ? 'text-white bg-neutral-800' : 'text-neutral-400 hover:text-white'
            }`}
            title="Pengaturan"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={onToggleFullscreen}
            className="p-2 text-neutral-400 hover:text-white rounded-full transition"
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Quiet Chunk Counter */}
        <div className="text-center mt-1.5 text-[10px] font-mono text-neutral-500 tracking-wider">
          {totalChunks > 0 ? currentIndex + 1 : 0} / {totalChunks}
        </div>
      </div>
    </div>
  );
};
