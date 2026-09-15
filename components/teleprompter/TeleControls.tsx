'use client';

import React, { useState, useEffect } from 'react';
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
  Volume2,
  VolumeX,
  Award,
  X,
} from 'lucide-react';
import {
  PlaybackState,
  TeleprompterMode,
  TeleprompterSettings,
  DynamicCaptionMode,
  PronunciationStrictness,
  CognitiveState,
  PronunciationStats,
} from '@/types/teleprompter';
import { getPronunciationStats, resetPronunciationStats } from '@/lib/tracking/pronunciationCoach';

interface TeleControlsProps {
  playbackState: PlaybackState;
  settings: TeleprompterSettings;
  currentIndex: number;
  totalChunks: number;
  cognitiveState?: CognitiveState;
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
  cognitiveState = 'ready',
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
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [coachStats, setCoachStats] = useState<PronunciationStats | null>(null);

  const isPlaying = playbackState === 'playing';

  const modes: { id: TeleprompterMode; label: string }[] = [
    { id: 'adaptive', label: 'Adaptive' },
    { id: 'voice_follow', label: 'Voice' },
    { id: 'smart_pace', label: 'Pacing' },
    { id: 'manual', label: 'Manual' },
  ];

  const captionModes: { id: DynamicCaptionMode; label: string; desc: string }[] = [
    { id: 'phrase_focus', label: 'Phrase Focus', desc: 'Fokus per frasa alami' },
    { id: 'word_follow', label: 'Word Follow', desc: 'Highlight kata per kata' },
    { id: 'cinematic_minimal', label: 'Cinematic', desc: 'Maksimal kontras tanpa highlight' },
  ];

  const strictnessLevels: { id: PronunciationStrictness; label: string; desc: string }[] = [
    { id: 'natural', label: 'Natural', desc: 'Toleransi tinggi, santai' },
    { id: 'balanced', label: 'Balanced', desc: 'Toleransi sedang (Default)' },
    { id: 'precise', label: 'Precise', desc: 'Toleransi rendah, teknis' },
  ];

  // Derive semantic status badge color and text matching user's design blueprint
  const getStatusBadge = () => {
    if (!isPlaying) {
      return { dotColor: 'bg-[#6B7280]', label: 'PAUSED', text: 'JEDA' };
    }
    switch (cognitiveState) {
      case 'speaking':
      case 'tracking':
        return { dotColor: 'bg-emerald-500 animate-pulse', label: 'VOICE FOLLOW', text: 'TRACKING' };
      case 'uncertain':
        return { dotColor: 'bg-amber-400', label: 'UNCERTAIN', text: 'MENDENGARKAN' };
      case 'thinking':
        return { dotColor: 'bg-sky-400', label: 'THINKING', text: 'MENUNGGU' };
      default:
        return {
          dotColor: 'bg-emerald-500',
          label: settings.mode === 'voice_follow' ? 'VOICE FOLLOW' : settings.mode.toUpperCase(),
          text: 'SIAP',
        };
    }
  };

  const statusBadge = getStatusBadge();

  // Load coach stats when coach modal opens
  useEffect(() => {
    if (showCoachModal) {
      setCoachStats(getPronunciationStats());
    }
  }, [showCoachModal]);

  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-40 transition-all duration-300 pointer-events-auto pb-safe font-sans ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
      }`}
    >
      {/* Settings Drawer */}
      {showDrawer && (
        <div className="bg-[#171A1F] border-t border-[#2A2E34] p-5 max-w-lg mx-auto rounded-t-2xl shadow-2xl backdrop-blur-md text-[#A1A7B3] space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-[#2A2E34]">
            <span className="text-xs font-mono uppercase tracking-widest text-[#F5F7FA] font-medium">
              Pengaturan Instrumen
            </span>
            <button
              onClick={() => setShowDrawer(false)}
              className="text-xs px-2.5 py-1 text-[#A1A7B3] hover:text-[#F5F7FA] bg-[#1F242A] hover:bg-[#2A2E34] rounded-lg transition"
            >
              Tutup
            </button>
          </div>

          {/* Dynamic Caption Mode */}
          <div>
            <span className="block text-[11px] text-[#A1A7B3] font-mono mb-2 uppercase">Gaya Teks Dinamis</span>
            <div className="grid grid-cols-3 gap-1.5 bg-[#0F1114] p-1 rounded-xl border border-[#2A2E34]">
              {captionModes.map((cm) => (
                <button
                  key={cm.id}
                  onClick={() => onUpdateSettings({ captionMode: cm.id })}
                  className={`py-2 px-1 text-xs rounded-lg font-medium transition text-center ${
                    settings.captionMode === cm.id
                      ? 'bg-[#1F242A] text-emerald-400 border border-emerald-500/30 shadow-sm'
                      : 'text-[#A1A7B3] hover:text-[#F5F7FA]'
                  }`}
                >
                  <div className="font-semibold text-[11px]">{cm.label}</div>
                  <div className="text-[9px] text-[#6B7280] line-clamp-1">{cm.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Mode Selector */}
          <div>
            <span className="block text-[11px] text-[#A1A7B3] font-mono mb-2 uppercase">Mode Penggerak</span>
            <div className="grid grid-cols-4 gap-1.5 bg-[#0F1114] p-1 rounded-xl border border-[#2A2E34]">
              {modes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onUpdateSettings({ mode: m.id })}
                  className={`py-1.5 text-xs rounded-lg font-medium transition ${
                    settings.mode === m.id
                      ? 'bg-[#1F242A] text-emerald-400 border border-emerald-500/30 shadow-sm'
                      : 'text-[#A1A7B3] hover:text-[#F5F7FA]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pronunciation Strictness */}
          <div>
            <span className="block text-[11px] text-[#A1A7B3] font-mono mb-2 uppercase">Evaluasi Pengucapan (Pronunciation)</span>
            <div className="grid grid-cols-3 gap-1.5 bg-[#0F1114] p-1 rounded-xl border border-[#2A2E34]">
              {strictnessLevels.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onUpdateSettings({ pronunciationStrictness: s.id })}
                  className={`py-2 px-1 text-xs rounded-lg font-medium transition text-center ${
                    settings.pronunciationStrictness === s.id
                      ? 'bg-[#1F242A] text-emerald-400 border border-emerald-500/30 shadow-sm'
                      : 'text-[#A1A7B3] hover:text-[#F5F7FA]'
                  }`}
                >
                  <div className="font-semibold text-[11px]">{s.label}</div>
                  <div className="text-[9px] text-[#6B7280] line-clamp-1">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Audio Tone & Pronunciation Coach Options */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => onUpdateSettings({ audioFeedbackEnabled: !settings.audioFeedbackEnabled })}
              className={`flex items-center justify-between py-2 px-3 text-xs rounded-xl border transition ${
                settings.audioFeedbackEnabled
                  ? 'bg-[#1F242A] border-emerald-500/40 text-emerald-400'
                  : 'bg-[#0F1114] border-[#2A2E34] text-[#A1A7B3] hover:text-[#F5F7FA]'
              }`}
            >
              <div className="flex items-center gap-2">
                {settings.audioFeedbackEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>Audio Feedback</span>
              </div>
              <span className="text-[10px] font-mono">{settings.audioFeedbackEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => setShowCoachModal(true)}
              className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs rounded-xl bg-[#0F1114] border border-[#2A2E34] text-[#A1A7B3] hover:text-[#F5F7FA] hover:border-[#383E46] transition"
            >
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>Statistik Latihan</span>
            </button>
          </div>

          {/* Camera Gaze Proximity */}
          <div>
            <span className="block text-[11px] text-[#A1A7B3] font-mono mb-2 uppercase">Posisi Fiksasi (Jarak Lensa Kamera)</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdateSettings({ focusPosition: 'lens_proximity' })}
                className={`flex items-center justify-center gap-2 py-2 px-3 text-xs rounded-xl border transition ${
                  settings.focusPosition === 'lens_proximity'
                    ? 'bg-[#1F242A] border-emerald-500/40 text-[#F5F7FA]'
                    : 'bg-[#0F1114] border-[#2A2E34] text-[#A1A7B3] hover:text-[#F5F7FA]'
                }`}
              >
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                Dekat Kamera (Atas)
              </button>
              <button
                onClick={() => onUpdateSettings({ focusPosition: 'center' })}
                className={`flex items-center justify-center gap-2 py-2 px-3 text-xs rounded-xl border transition ${
                  settings.focusPosition === 'center'
                    ? 'bg-[#1F242A] border-emerald-500/40 text-[#F5F7FA]'
                    : 'bg-[#0F1114] border-[#2A2E34] text-[#A1A7B3] hover:text-[#F5F7FA]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Tengah Layar
              </button>
            </div>
          </div>

          {/* Font Size & Speed Multiplier Sliders */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <div className="flex justify-between text-xs mb-1.5 text-[#A1A7B3] font-mono">
                <span>Ukuran Font</span>
                <span className="text-[#F5F7FA] font-semibold">{settings.fontSize}px</span>
              </div>
              <input
                type="range"
                min="24"
                max="56"
                step="2"
                value={settings.fontSize}
                onChange={(e) => onUpdateSettings({ fontSize: Number(e.target.value) })}
                className="w-full accent-emerald-500 bg-[#1F242A] h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 text-[#A1A7B3] font-mono">
                <span>Tempo Pacing</span>
                <span className="text-[#F5F7FA] font-semibold">{settings.speedMultiplier.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={settings.speedMultiplier}
                onChange={(e) => onUpdateSettings({ speedMultiplier: Number(e.target.value) })}
                className="w-full accent-emerald-500 bg-[#1F242A] h-1.5 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Mirror Mode (Beam Splitter Rig) */}
          <div className="pt-2 border-t border-[#2A2E34] flex items-center justify-between">
            <span className="text-xs text-[#A1A7B3]">Mirror Horizontal (Rig Kaca Teleprompter)</span>
            <button
              onClick={() => onUpdateSettings({ mirrorMode: !settings.mirrorMode })}
              className={`p-2 rounded-xl border transition ${
                settings.mirrorMode
                  ? 'bg-[#1F242A] border-emerald-500/40 text-emerald-400'
                  : 'bg-[#0F1114] border-[#2A2E34] text-[#6B7280]'
              }`}
              title="Mirror Horizontal"
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* COMPACT INSTRUMENT DOCK (#171A1F, Green 600 Play Button) */}
      <div className="max-w-md mx-auto px-4 pb-3">
        <div className="bg-[#171A1F]/95 border border-[#2A2E34] rounded-2xl px-4 py-2.5 shadow-2xl backdrop-blur-md flex items-center justify-between">
          {/* 1. Restart */}
          <button
            onClick={onRestart}
            className="p-2 text-[#A1A7B3] hover:text-[#F5F7FA] hover:bg-[#1F242A] rounded-xl transition"
            title="Mulai Ulang (Restart)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* 2. Previous Chunk */}
          <button
            onClick={onPrev}
            disabled={currentIndex <= 0}
            className="p-2 text-[#A1A7B3] hover:text-[#F5F7FA] disabled:opacity-20 hover:bg-[#1F242A] rounded-xl transition"
            title="Kalimat Sebelumnya"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* 3. PRIMARY PLAY / PAUSE BUTTON (Green 600 #22C55E Circle) */}
          <button
            onClick={onTogglePlay}
            className="w-12 h-12 rounded-full bg-[#22C55E] hover:bg-[#16A34A] text-neutral-950 flex items-center justify-center shadow-lg shadow-emerald-950/40 transition active:scale-95"
            title={isPlaying ? 'Jeda' : 'Mulai Membaca'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* 4. Next Chunk */}
          <button
            onClick={onNext}
            disabled={currentIndex >= totalChunks - 1}
            className="p-2 text-[#A1A7B3] hover:text-[#F5F7FA] disabled:opacity-20 hover:bg-[#1F242A] rounded-xl transition"
            title="Kalimat Berikutnya"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* 5. Settings */}
          <button
            onClick={() => setShowDrawer(!showDrawer)}
            className={`p-2 rounded-xl transition ${
              showDrawer
                ? 'text-emerald-400 bg-[#1F242A] border border-emerald-500/30'
                : 'text-[#A1A7B3] hover:text-[#F5F7FA] hover:bg-[#1F242A]'
            }`}
            title="Pengaturan Instrumen"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* 6. Fullscreen */}
          <button
            onClick={onToggleFullscreen}
            className="p-2 text-[#A1A7B3] hover:text-[#F5F7FA] hover:bg-[#1F242A] rounded-xl transition"
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* INTEGRATED INSTRUMENT STATUS LINE (e.g. ● VOICE FOLLOW • 5 / 12 Phrase) */}
        <div className="flex items-center justify-center gap-2 mt-2 text-[11px] font-mono text-[#6B7280] tracking-wider select-none">
          <span className={`w-2 h-2 rounded-full ${statusBadge.dotColor}`} />
          <span className="text-[#A1A7B3] font-medium">{statusBadge.label}</span>
          <span>•</span>
          <span className="text-neutral-400">
            {totalChunks > 0 ? currentIndex + 1 : 0} / {totalChunks} Phrase
          </span>
        </div>
      </div>

      {/* Pronunciation Coach Stats Modal */}
      {showCoachModal && coachStats && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl max-w-sm w-full p-5 text-[#F5F5F5] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2A2A2A]">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold">Pronunciation Coach</span>
              </div>
              <button
                onClick={() => setShowCoachModal(false)}
                className="p-1 text-[#A3A3A3] hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-3 bg-[#111111] rounded-xl border border-[#2A2A2A]">
                <div className="text-2xl font-bold text-emerald-400">{coachStats.wordsPracticed}</div>
                <div className="text-[10px] text-[#A3A3A3] font-mono mt-0.5">Kata Dilatih</div>
              </div>
              <div className="p-3 bg-[#111111] rounded-xl border border-[#2A2A2A]">
                <div className="text-2xl font-bold text-[#F5F5F5]">
                  {coachStats.wordsPracticed > 0
                    ? Math.round((coachStats.wordsCorrect / coachStats.wordsPracticed) * 100)
                    : 100}
                  %
                </div>
                <div className="text-[10px] text-[#A3A3A3] font-mono mt-0.5">Tingkat Kejelasan</div>
              </div>
            </div>

            {/* Troubled words */}
            <div>
              <span className="block text-[11px] text-[#A3A3A3] font-mono mb-2 uppercase">Kata Yang Paling Sering Diulang</span>
              {coachStats.troubledWords.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {coachStats.troubledWords.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-2.5 py-1.5 bg-[#111111] rounded-lg text-xs font-mono border border-[#2A2A2A]"
                    >
                      <span className="text-neutral-300">{item.word}</span>
                      <span className="text-amber-400">{item.count}x ulang</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#6B7280] italic text-center py-2">
                  Belum ada kata yang perlu diperbaiki.
                </p>
              )}
            </div>

            <div className="pt-2 flex justify-between items-center text-xs">
              <button
                onClick={() => {
                  resetPronunciationStats();
                  setCoachStats(getPronunciationStats());
                }}
                className="text-[#6B7280] hover:text-red-400 transition"
              >
                Reset Statistik
              </button>
              <button
                onClick={() => setShowCoachModal(false)}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-medium rounded-xl transition"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
