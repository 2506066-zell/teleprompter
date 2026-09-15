'use client';

import React, { useMemo } from 'react';
import { Chunk, TeleprompterSettings, DynamicCaptionMode, PronunciationFeedback } from '@/types/teleprompter';
import { Check, X, Volume2 } from 'lucide-react';

interface FocusZoneProps {
  chunks: Chunk[];
  currentIndex: number;
  activeWordIndex?: number;
  captionMode?: DynamicCaptionMode;
  settings: TeleprompterSettings;
  pronunciationFeedback?: PronunciationFeedback;
  onSkipCorrection?: () => void;
  onClearPronunciationFeedback?: () => void;
  onSelectChunk?: (index: number) => void;
  isLandscape?: boolean;
}

export const FocusZone: React.FC<FocusZoneProps> = ({
  chunks,
  currentIndex,
  activeWordIndex = 0,
  captionMode = 'phrase_focus',
  settings,
  pronunciationFeedback,
  onSkipCorrection,
  onClearPronunciationFeedback,
  onSelectChunk,
  isLandscape = false,
}) => {
  const currentChunk = chunks[currentIndex] || null;

  // Context phrases: 2 previous and 2 upcoming for uninterrupted peripheral flow
  const prevChunks = useMemo(() => {
    return [
      currentIndex >= 2 ? chunks[currentIndex - 2] : null,
      currentIndex >= 1 ? chunks[currentIndex - 1] : null,
    ].filter(Boolean) as Chunk[];
  }, [chunks, currentIndex]);

  const nextChunks = useMemo(() => {
    return [
      currentIndex + 1 < chunks.length ? chunks[currentIndex + 1] : null,
      currentIndex + 2 < chunks.length ? chunks[currentIndex + 2] : null,
    ].filter(Boolean) as Chunk[];
  }, [chunks, currentIndex]);

  const mirrorStyle = settings.mirrorMode ? { transform: 'scaleX(-1)' } : undefined;

  // Maximum width constrained to 35–60 characters per line for optimal mobile reading
  const maxLineConstraint =
    settings.lineLength === 'compact'
      ? 'max-w-md'
      : settings.lineLength === 'wide'
      ? 'max-w-2xl'
      : 'max-w-xl';

  // Camera-Proximity Focus Zone: keeps active phrase anchored in the upper 32-40% of screen
  const verticalAlignmentClass =
    settings.focusPosition === 'lens_proximity'
      ? isLandscape
        ? 'pt-10 sm:pt-12 pb-24 justify-start'
        : 'pt-14 sm:pt-18 pb-32 justify-start'
      : 'justify-center py-10';

  // Strict Typography Metrics: 32–44px for active phrase, 1.2 line-height
  const activeFontSize = Math.min(44, Math.max(30, settings.fontSize));
  const nearContextFontSize = Math.max(20, Math.round(activeFontSize * 0.68));
  const farContextFontSize = Math.max(16, Math.round(activeFontSize * 0.54));

  // Words of the active chunk
  const currentWords = useMemo(() => {
    return currentChunk ? currentChunk.text.split(/\s+/).filter(Boolean) : [];
  }, [currentChunk]);

  const importantTerms = useMemo(() => {
    return currentChunk?.importantWords || [];
  }, [currentChunk]);

  const isWordImportant = (word: string) => {
    const clean = word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    return importantTerms.some((term) => term.toLowerCase() === clean);
  };

  return (
    <div
      className={`relative flex flex-col items-center w-full h-full px-4 select-none overflow-hidden font-sans ${verticalAlignmentClass}`}
      style={mirrorStyle}
    >
      {/* 1. UPSTREAM CONTEXT WINDOW (Far: 20-30%, Near: 60-75% Legibility) */}
      <div className={`w-full ${maxLineConstraint} text-center space-y-3 mb-4 pointer-events-auto transition-opacity duration-200`}>
        {prevChunks.map((chunk, idx) => {
          const isImmediate = idx === prevChunks.length - 1;
          const opacity = isImmediate ? 0.70 : 0.28;
          const fontSize = isImmediate ? nearContextFontSize : farContextFontSize;

          return (
            <p
              key={chunk.id}
              onClick={() => onSelectChunk && onSelectChunk(chunk.order)}
              className="text-[#A1A7B3] hover:text-[#F5F7FA] cursor-pointer font-normal tracking-tight transition-all duration-200 line-clamp-2"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: 1.35,
                opacity,
              }}
            >
              {chunk.text}
            </p>
          );
        })}
      </div>

      {/* 2. CAMERA-PROXIMITY ACTIVE FOCUS ZONE (100% Contrast #F5F7FA, Frozen Geometry) */}
      <div className={`w-full ${maxLineConstraint} text-center my-2 relative z-10`}>
        {currentChunk ? (
          <div className="relative inline-block w-full">
            {/*
              CRITICAL ZERO-REFLOW IMPLEMENTATION:
              - Paragraph has precomputed, locked line-height (1.25) and font-size
              - Every word token maintains EXACT constant padding (px-1.5 py-0.5) and CONSTANT font-semibold
              - Changing active word alters ONLY color & background-color (180ms ease-out)
              - scale: 1 is strictly preserved (NO scale up, NO margin change, NO font-weight shift)
              - Line breaks and word positions remain 100% frozen!
            */}
            <h1
              className="tracking-[-0.015em] text-[#F5F7FA] font-semibold antialiased leading-[1.28] transition-colors duration-200"
              style={{
                fontSize: `${activeFontSize}px`,
              }}
            >
              {captionMode === 'word_follow' ? (
                /* Dynamic Caption Word-Follow Mode (Constant geometry, color-only transition) */
                <span className="inline leading-[1.32]">
                  {currentWords.map((word, wIdx) => {
                    const isActive = wIdx === activeWordIndex;
                    const isPast = wIdx < activeWordIndex;
                    const isSpecial = isWordImportant(word);

                    return (
                      <span
                        key={wIdx}
                        className={`inline-block px-1.5 py-0.5 mx-0.5 rounded-md transition-colors duration-200 ease-out font-semibold ${
                          isActive
                            ? 'text-emerald-400 bg-emerald-500/20 shadow-none'
                            : isPast
                            ? 'text-[#F5F7FA] opacity-90 bg-transparent'
                            : 'text-[#A1A7B3] opacity-65 bg-transparent'
                        } ${isSpecial && !isActive ? 'border-b border-emerald-500/40 text-emerald-300' : ''}`}
                      >
                        {word}
                      </span>
                    );
                  })}
                </span>
              ) : captionMode === 'cinematic_minimal' ? (
                /* Cinematic Minimal Mode (High contrast active text without moving pill) */
                <span className="inline text-[#F5F7FA] font-medium leading-[1.3]">
                  {currentChunk.text}
                </span>
              ) : (
                /* Phrase Focus Mode (Default Mode 1: Clean, stable phrase highlight) */
                <span className="inline text-[#F5F7FA] font-semibold leading-[1.3]">
                  {currentWords.map((word, wIdx) => {
                    const isSpecial = isWordImportant(word);
                    return (
                      <span
                        key={wIdx}
                        className={`inline-block px-1 py-0.5 mx-0.5 ${
                          isSpecial ? 'border-b border-emerald-500/50 text-emerald-300' : ''
                        }`}
                      >
                        {word}
                      </span>
                    );
                  })}
                </span>
              )}
            </h1>

            {/* Subtle natural punctuation pause indicator */}
            {/[.!?]$/.test(currentChunk.text) && (
              <span className="inline-block ml-2 w-1.5 h-1.5 rounded-full bg-emerald-500/70 align-middle" />
            )}

            {/*
              2.1 NON-DISRUPTIVE PRONUNCIATION MICRO-CORRECTION OVERLAY
              Matching the exact layout from the design blueprint (Section 5: Pronunciation Correction)
              Zero layout push on the active text lines above.
            */}
            {pronunciationFeedback && pronunciationFeedback.status !== 'none' && (
              <div className="mt-4 flex flex-col items-center">
                {pronunciationFeedback.status === 'correct' ? (
                  /* Green Confirmation Card: Check + Target Word + Lanjut... */
                  <div className="bg-[#171A1F] border border-emerald-500/40 rounded-xl px-4 py-2.5 shadow-2xl flex items-center justify-between gap-3 text-xs min-w-[260px] animate-in fade-in duration-150">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-emerald-950/80 text-emerald-400 rounded-lg border border-emerald-500/30">
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <div className="text-left">
                        <div className="text-[#F5F7FA] font-semibold text-sm">
                          {pronunciationFeedback.targetWord}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-mono">
                          Pengucapan jelas • Lanjut...
                        </div>
                      </div>
                    </div>
                    <Check className="w-4 h-4 text-emerald-400 stroke-[2]" />
                  </div>
                ) : (
                  /* Red/Amber Warning Card: Audio Wave + Detected Word + Coba ulangi: target */
                  <div className="bg-[#171A1F] border border-[#2A2E34] rounded-xl px-4 py-2.5 shadow-2xl flex items-center justify-between gap-3 text-xs min-w-[270px] max-w-sm animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center gap-2.5">
                      {/* Waveform / Warning Icon */}
                      <div className="p-1.5 bg-rose-950/60 text-rose-400 rounded-lg border border-rose-500/30">
                        <div className="flex items-center gap-0.5 h-4">
                          <span className="w-0.5 h-2 bg-rose-400 rounded-full animate-pulse" />
                          <span className="w-0.5 h-4 bg-rose-400 rounded-full" />
                          <span className="w-0.5 h-2.5 bg-rose-400 rounded-full animate-pulse" />
                          <span className="w-0.5 h-1.5 bg-rose-400 rounded-full" />
                        </div>
                      </div>

                      <div className="text-left">
                        <div className="text-[#F5F7FA] font-semibold text-sm flex items-center gap-1.5">
                          <span className="text-rose-400 line-through opacity-80 text-xs">
                            {pronunciationFeedback.detectedWord || '...'}
                          </span>
                          <span className="text-[#F5F7FA] font-bold">
                            {pronunciationFeedback.targetWord}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#A1A7B3]">
                          {pronunciationFeedback.status === 'unclear'
                            ? 'Kurang jelas — coba ulangi'
                            : `Coba ulangi: ${pronunciationFeedback.targetWord}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Non-blocking skip button if attempt >= 2 */}
                      {pronunciationFeedback.allowSkip && onSkipCorrection && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSkipCorrection();
                          }}
                          className="px-2 py-1 text-[11px] font-semibold bg-[#1F242A] hover:bg-[#2A2E34] text-neutral-200 rounded-lg transition border border-[#2A2E34]"
                          title="Lewati kata ini"
                        >
                          Lanjut →
                        </button>
                      )}

                      {/* Dismiss icon */}
                      {onClearPronunciationFeedback && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onClearPronunciationFeedback();
                          }}
                          className="p-1 text-[#6B7280] hover:text-[#F5F7FA] transition rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-[#6B7280] font-normal text-base tracking-wide font-mono">
            — Naskah Selesai —
          </p>
        )}
      </div>

      {/* 3. DOWNSTREAM CONTEXT WINDOW (Immediate: 40-50%, Far: 20-30% Legibility) */}
      <div className={`w-full ${maxLineConstraint} text-center space-y-3 mt-4 pointer-events-auto transition-opacity duration-200`}>
        {nextChunks.map((chunk, idx) => {
          const isImmediate = idx === 0;
          const opacity = isImmediate ? 0.48 : 0.24;
          const fontSize = isImmediate ? nearContextFontSize : farContextFontSize;

          return (
            <p
              key={chunk.id}
              onClick={() => onSelectChunk && onSelectChunk(chunk.order)}
              className="text-[#A1A7B3] hover:text-[#F5F7FA] cursor-pointer font-normal tracking-tight transition-all duration-200 line-clamp-2"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: 1.35,
                opacity,
              }}
            >
              {chunk.text}
            </p>
          );
        })}

        {nextChunks.length === 0 && (
          <div className="pt-4 text-[#6B7280] text-[11px] font-mono tracking-widest uppercase">
            — Akhir Naskah —
          </div>
        )}
      </div>
    </div>
  );
};
