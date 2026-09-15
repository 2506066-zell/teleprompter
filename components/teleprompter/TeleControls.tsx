'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  FlipHorizontal,
  Maximize2,
  Minimize2,
  Eye,
  Camera,
  Volume2,
  VolumeX,
  Award,
  X,
  Scan,
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
  showSettingsDrawer?: boolean;
  onToggleSettingsDrawer?: (open: boolean) => void;
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
  showSettingsDrawer: externalShowDrawer,
  onToggleSettingsDrawer,
}) => {
  const [internalShowDrawer, setInternalShowDrawer] = useState(false);
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [coachStats, setCoachStats] = useState<PronunciationStats | null>(null);

  const isDrawerOpen = externalShowDrawer !== undefined ? externalShowDrawer : internalShowDrawer;
  const setDrawerOpen = (open: boolean) => {
    if (onToggleSettingsDrawer) {
      onToggleSettingsDrawer(open);
    } else {
      setInternalShowDrawer(open);
    }
  };

  const isPlaying = playbackState === 'playing';

  const modes: { id: TeleprompterMode; label: string }[] = [
    { id: 'voice_follow', label: 'Voice' },
    { id: 'adaptive', label: 'Adaptive' },
    { id: 'smart_pace', label: 'Pacing' },
    { id: 'manual', label: 'Manual' },
  ];

  const captionModes: { id: DynamicCaptionMode; label: string; desc: string }[] = [
    { id: 'word_follow', label: 'Word Follow', desc: 'Highlight kata demi kata' },
    { id: 'phrase_focus', label: 'Phrase Focus', desc: 'Fokus per frasa' },
    { id: 'cinematic_minimal', label: 'Cinematic', desc: 'Kontras tanpa highlight' },
  ];

  const strictnessLevels: { id: PronunciationStrictness; label: string; desc: string }[] = [
    { id: 'natural', label: 'Natural', desc: 'Santai, toleransi tinggi' },
    { id: 'balanced', label: 'Balanced', desc: 'Standar akurat' },
    { id: 'precise', label: 'Precise', desc: 'Ketat, istilah teknis' },
  ];

  // Speed multiplier cycle: 0.8x -> 1.0x -> 1.2x -> 1.5x -> 2.0x -> 0.8x
  const speedOptions = [0.8, 1.0, 1.2, 1.5, 2.0];
  const cycleSpeed = () => {
    const current = Number(settings.speedMultiplier.toFixed(1));
    const nextIdx = (speedOptions.indexOf(current) + 1) % speedOptions.length;
    onUpdateSettings({ speedMultiplier: speedOptions[nextIdx] });
  };

  // Line constraint cycle: compact -> normal -> wide -> compact
  const cycleLineLength = () => {
    const next =
      settings.lineLength === 'compact'
        ? 'normal'
        : settings.lineLength === 'normal'
        ? 'wide'
        : 'compact';
    onUpdateSettings({ lineLength: next });
  };

  // Load coach stats when coach modal opens
  useEffect(() => {
    if (showCoachModal) {
      setCoachStats(getPronunciationStats());
    }
  }, [showCoachModal]);

  const isVoiceActive =
    settings.mode === 'voice_follow' || settings.mode === 'adaptive';

  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-40 transition-all duration-300 pointer-events-auto pb-safe font-sans ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
      }`}
    >
      {/* Settings Drawer */}
      {isDrawerOpen && (
        <div className="bg-[#131722] border-t border-white/10 p-5 max-w-md mx-auto rounded-t-3xl shadow-2xl backdrop-blur-2xl text-[#A1A7B3] space-y-4 max-h-[75vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="text-xs font-mono uppercase tracking-widest text-[#F5F7FA] font-medium">
              Pengaturan Teleprompter
            </span>
            <button
              onClick={() => setDrawerOpen(false)}
              className="text-xs px-2.5 py-1 text-[#A1A7B3] hover:text-[#F5F7FA] bg-[#1F242A] hover:bg-[#2A2E34] rounded-lg transition"
            >
              Tutup
            </button>
          </div>

          {/* Dynamic Caption Mode */}
          <div>
            <span className="block text-[11px] text-[#A1A7B3] font-mono mb-2 uppercase">Gaya Teks Dinamis</span>
            <div className="grid grid-cols-3 gap-1.5 bg-[#090C12] p-1 rounded-xl border border-white/5">
              {captionModes.map((cm) => (
                <button
                  key={cm.id}
                  onClick={() => onUpdateSettings({ captionMode: cm.id })}
                  className={`py-2 px-1 text-xs rounded-lg font-medium transition text-center ${
                    settings.captionMode === cm.id
                      ? 'bg-[#1C2330] text-emerald-400 border border-emerald-500/30 shadow-sm'
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
            <div className="grid grid-cols-4 gap-1.5 bg-[#090C12] p-1 rounded-xl border border-white/5">
              {modes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onUpdateSettings({ mode: m.id })}
                  className={`py-1.5 text-xs rounded-lg font-medium transition ${
                    settings.mode === m.id
                      ? 'bg-[#1C2330] text-emerald-400 border border-emerald-500/30 shadow-sm'
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
            <div className="grid grid-cols-3 gap-1.5 bg-[#090C12] p-1 rounded-xl border border-white/5">
              {strictnessLevels.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onUpdateSettings({ pronunciationStrictness: s.id })}
                  className={`py-2 px-1 text-xs rounded-lg font-medium transition text-center ${
                    settings.pronunciationStrictness === s.id
                      ? 'bg-[#1C2330] text-emerald-400 border border-emerald-500/30 shadow-sm'
                      : 'text-[#A1A7B3] hover:text-[#F5F7FA]'
                  }`}
                >
                  <div className="font-semibold text-[11px]">{s.label}</div>
                  <div className="text-[9px] text-[#6B7280] line-clamp-1">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Audio Feedback & Coach Stats */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => onUpdateSettings({ audioFeedbackEnabled: !settings.audioFeedbackEnabled })}
              className={`flex items-center justify-between py-2 px-3 text-xs rounded-xl border transition ${
                settings.audioFeedbackEnabled
                  ? 'bg-[#1C2330] border-emerald-500/40 text-emerald-400'
                  : 'bg-[#090C12] border-white/10 text-[#A1A7B3] hover:text-[#F5F7FA]'
              }`}
            >
              <div className="flex items-center gap-2">
                {settings.audioFeedbackEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>Audio Tone</span>
              </div>
              <span className="text-[10px] font-mono">{settings.audioFeedbackEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => setShowCoachModal(true)}
              className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs rounded-xl bg-[#090C12] border border-white/10 text-[#A1A7B3] hover:text-[#F5F7FA] transition"
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
                    ? 'bg-[#1C2330] border-emerald-500/40 text-[#F5F7FA]'
                    : 'bg-[#090C12] border-white/10 text-[#A1A7B3] hover:text-[#F5F7FA]'
                }`}
              >
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                Dekat Lensa (Atas)
              </button>
              <button
                onClick={() => onUpdateSettings({ focusPosition: 'center' })}
                className={`flex items-center justify-center gap-2 py-2 px-3 text-xs rounded-xl border transition ${
                  settings.focusPosition === 'center'
                    ? 'bg-[#1C2330] border-emerald-500/40 text-[#F5F7FA]'
                    : 'bg-[#090C12] border-white/10 text-[#A1A7B3] hover:text-[#F5F7FA]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Tengah Layar
              </button>
            </div>
          </div>

          {/* Font Size Slider */}
          <div className="pt-1">
            <div className="flex justify-between text-xs mb-1.5 text-[#A1A7B3] font-mono">
              <span>Ukuran Font</span>
              <span className="text-[#F5F7FA] font-semibold">{settings.fontSize}px</span>
            </div>
            <input
              type="range"
              min="26"
              max="48"
              step="2"
              value={settings.fontSize}
              onChange={(e) => onUpdateSettings({ fontSize: Number(e.target.value) })}
              className="w-full accent-emerald-500 bg-[#1F242A] h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Mirror Mode (Beam Splitter Glass) */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-[#A1A7B3]">Mirror Horizontal (Rig Kaca)</span>
            <button
              onClick={() => onUpdateSettings({ mirrorMode: !settings.mirrorMode })}
              className={`p-2 rounded-xl border transition ${
                settings.mirrorMode
                  ? 'bg-[#1C2330] border-emerald-500/40 text-emerald-400'
                  : 'bg-[#090C12] border-white/10 text-[#6B7280]'
              }`}
              title="Mirror Horizontal"
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 7-ELEMENT INSTRUMENT DOCK (Exact 1:1 match to reference screenshot) */}
      <div className="max-w-[370px] w-[94%] mx-auto px-2 pb-2">
        <div className="bg-[#131722]/90 border border-white/10 rounded-[28px] px-3.5 py-2 backdrop-blur-xl shadow-2xl flex items-center justify-between gap-1 sm:gap-2">
          {/* Element 1: Frame / Scan Icon */}
          <button
            onClick={cycleLineLength}
            className="p-1.5 text-neutral-300 hover:text-white rounded-xl transition active:scale-95"
            title={`Format Lebar Baris: ${settings.lineLength}`}
          >
            <Scan className="w-5 h-5" />
          </button>

          {/* Element 2: Phrase Counter (e.g. 5 / 12 Phrase) */}
          <div className="flex flex-col items-center justify-center px-1 select-none cursor-default">
            <span className="text-xs font-semibold text-white tracking-wide leading-tight">
              {totalChunks > 0 ? currentIndex + 1 : 0} / {totalChunks}
            </span>
            <span className="text-[9px] text-neutral-400 font-medium tracking-tight leading-none mt-0.5">
              Phrase
            </span>
          </div>

          {/* Element 3: Chevron Left (<) */}
          <button
            onClick={onPrev}
            disabled={currentIndex <= 0}
            className="p-1.5 text-neutral-300 hover:text-white disabled:opacity-20 rounded-xl transition active:scale-95"
            title="Kalimat Sebelumnya"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Element 4: Circular White Play / Pause Button */}
          <button
            onClick={onTogglePlay}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:bg-neutral-100 active:scale-95 transition-transform"
            title={isPlaying ? 'Jeda' : 'Mulai Membaca'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-black stroke-[2.5]" />
            ) : (
              <Play className="w-5 h-5 fill-black ml-0.5" />
            )}
          </button>

          {/* Element 5: Chevron Right (>) */}
          <button
            onClick={onNext}
            disabled={currentIndex >= totalChunks - 1}
            className="p-1.5 text-neutral-300 hover:text-white disabled:opacity-20 rounded-xl transition active:scale-95"
            title="Kalimat Berikutnya"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Element 6: Speed Multiplier (1.0x ▾) */}
          <button
            onClick={cycleSpeed}
            className="flex items-center gap-0.5 text-xs font-semibold text-neutral-200 hover:text-white px-1.5 py-1 rounded-lg hover:bg-white/5 transition active:scale-95"
            title="Ubah Kecepatan Pacing"
          >
            <span>{settings.speedMultiplier.toFixed(1)}x</span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          </button>

          {/* Element 7: Fullscreen Toggle (⤢) */}
          <button
            onClick={onToggleFullscreen}
            className="p-1.5 text-neutral-300 hover:text-white rounded-xl transition active:scale-95"
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Status Subline Below Dock: ● VOICE FOLLOW */}
        <div className="flex items-center justify-center gap-1.5 mt-2.5 select-none">
          <span
            className={`w-2 h-2 rounded-full ${
              isPlaying
                ? isVoiceActive
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-emerald-500'
                : 'bg-neutral-500'
            }`}
          />
          <span className="text-[10px] font-bold tracking-widest text-emerald-400/90 uppercase">
            VOICE FOLLOW
          </span>
        </div>

        {/* Minimal phone home bar indicator */}
        <div className="w-28 h-1 bg-white/20 rounded-full mx-auto mt-2 select-none pointer-events-none" />
      </div>

      {/* Pronunciation Coach Stats Modal */}
      {showCoachModal && coachStats && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131722] border border-white/10 rounded-2xl max-w-sm w-full p-5 text-[#F5F5F5] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
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
              <div className="p-3 bg-[#090C12] rounded-xl border border-white/5">
                <div className="text-2xl font-bold text-emerald-400">{coachStats.wordsPracticed}</div>
                <div className="text-[10px] text-[#A3A3A3] font-mono mt-0.5">Kata Dilatih</div>
              </div>
              <div className="p-3 bg-[#090C12] rounded-xl border border-white/5">
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
                      className="flex items-center justify-between px-2.5 py-1.5 bg-[#090C12] rounded-lg text-xs font-mono border border-white/5"
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
