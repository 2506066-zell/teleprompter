'use client';

import React from 'react';
import { Chunk, TeleprompterSettings, DynamicCaptionMode, PronunciationFeedback } from '@/types/teleprompter';
import { Check, X } from 'lucide-react';

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
  const prevChunks = [
    currentIndex >= 2 ? chunks[currentIndex - 2] : null,
    currentIndex >= 1 ? chunks[currentIndex - 1] : null,
  ].filter(Boolean) as Chunk[];

  const nextChunks = [
    currentIndex + 1 < chunks.length ? chunks[currentIndex + 1] : null,
    currentIndex + 2 < chunks.length ? chunks[currentIndex + 2] : null,
  ].filter(Boolean) as Chunk[];

  const mirrorStyle = settings.mirrorMode ? { transform: 'scaleX(-1)' } : undefined;

  // Optimal width constraint for 35–50 characters per line
  const maxLineConstraint =
    settings.lineLength === 'compact'
      ? 'max-w-md'
      : settings.lineLength === 'wide'
      ? 'max-w-2xl'
      : 'max-w-xl';

  // Camera-Proximity Focus Zone: places active line close to smartphone top lens
  const verticalAlignmentClass =
    settings.focusPosition === 'lens_proximity'
      ? isLandscape
        ? 'pt-12 sm:pt-14 pb-24 justify-start'
        : 'pt-16 sm:pt-20 pb-32 justify-start'
      : 'justify-center py-10';

  // Responsive typography scale: 32–44px for active phrase, never poster-oversized
  const activeFontSize = Math.min(44, Math.max(30, settings.fontSize));
  const nearContextFontSize = Math.max(18, Math.round(activeFontSize * 0.70));
  const farContextFontSize = Math.max(16, Math.round(activeFontSize * 0.58));

  // Words of the active chunk
  const currentWords = currentChunk ? currentChunk.text.split(/\s+/).filter(Boolean) : [];
  const importantTerms = currentChunk?.importantWords || [];

  const isWordImportant = (word: string) => {
    const clean = word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    return importantTerms.some((term) => term.toLowerCase() === clean);
  };

  return (
    <div
      className={`relative flex flex-col items-center w-full h-full px-4 select-none overflow-hidden transition-all duration-300 ease-out font-sans ${verticalAlignmentClass}`}
      style={mirrorStyle}
    >
      {/* 1. UPSTREAM CONTEXT WINDOW (Readable at 65-75% and 45-55%, never pitch black) */}
      <div className={`w-full ${maxLineConstraint} text-center space-y-2.5 mb-3 sm:mb-5 pointer-events-auto`}>
        {prevChunks.map((chunk, idx) => {
          const isImmediate = idx === prevChunks.length - 1;
          // Near context: 65–75%, Far previous: 45–55%
          const opacity = isImmediate ? 0.72 : 0.48;
          const fontSize = isImmediate ? nearContextFontSize : farContextFontSize;

          return (
            <p
              key={chunk.id}
              onClick={() => onSelectChunk && onSelectChunk(chunk.order)}
              className="text-[#A3A3A3] hover:text-[#F5F5F5] cursor-pointer font-normal tracking-tight transition-all duration-200 line-clamp-2"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: 1.28,
                opacity,
              }}
            >
              {chunk.text}
            </p>
          );
        })}
      </div>

      {/* 2. CAMERA-PROXIMITY ACTIVE FOCUS ZONE (100% Contrast #F5F5F5, 32-44px) */}
      <div className={`w-full ${maxLineConstraint} text-center my-1.5 sm:my-2.5 relative z-10`}>
        {currentChunk ? (
          <div className="relative inline-block px-2 py-1">
            <h1
              className="tracking-[-0.015em] text-[#F5F5F5] font-medium antialiased transition-all duration-200"
              style={{
                fontSize: `${activeFontSize}px`,
                lineHeight: 1.24,
              }}
            >
              {captionMode === 'word_follow' ? (
                /* Dynamic Caption Word-Follow Mode (Green 600 Highlight) */
                <span className="flex flex-wrap justify-center gap-x-2 gap-y-1.5">
                  {currentWords.map((word, wIdx) => {
                    const isPast = wIdx < activeWordIndex;
                    const isActive = wIdx === activeWordIndex;
                    const isUpcoming = wIdx > activeWordIndex;
                    const isSpecial = isWordImportant(word);

                    return (
                      <span
                        key={wIdx}
                        className={`transition-all duration-150 inline-block ${
                          isActive
                            ? 'text-emerald-400 bg-emerald-500/15 font-semibold px-2 py-0.5 rounded-md shadow-sm'
                            : isPast
                            ? 'text-[#F5F5F5] opacity-90'
                            : 'text-[#A3A3A3] opacity-65'
                        } ${isSpecial && !isActive ? 'border-b border-emerald-500/50 text-emerald-300/90' : ''}`}
                      >
                        {word}
                      </span>
                    );
                  })}
                </span>
              ) : captionMode === 'cinematic_minimal' ? (
                /* Cinematic Minimal Mode */
                <span className="text-[#F5F5F5] font-normal leading-snug">
                  {currentChunk.text}
                </span>
              ) : (
                /* Phrase Focus Mode (Default Mode A) */
                <span className="text-[#F5F5F5] font-medium leading-snug">
                  {currentWords.map((word, wIdx) => {
                    const isSpecial = isWordImportant(word);
                    return (
                      <span
                        key={wIdx}
                        className={`inline-block mr-1.5 ${
                          isSpecial ? 'border-b border-emerald-500/60 text-emerald-300' : ''
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
              <span className="inline-block ml-2 w-1.5 h-1.5 rounded-full bg-emerald-500/60 align-middle" />
            )}

            {/* 2.1 PRONUNCIATION-AWARE MICRO-CORRECTION PILL */}
            {pronunciationFeedback && pronunciationFeedback.status !== 'none' && (
              <div className="mt-3.5 flex flex-col items-center">
                {pronunciationFeedback.status === 'correct' ? (
                  /* Brief subtle confirmation badge */
                  <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-full px-3 py-1 shadow-lg flex items-center gap-1.5 text-xs font-mono animate-in fade-in duration-150">
                    <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                    <span>{pronunciationFeedback.targetWord || 'Pengucapan Jelas'}</span>
                  </div>
                ) : (
                  /* Micro-Interruption Correction Pill (Matching Design Blueprint) */
                  <div className="bg-[#1A1A1A] border border-[#2A2A2A] text-neutral-200 rounded-xl px-3.5 py-2 shadow-2xl flex items-center gap-3 text-xs max-w-sm mx-auto animate-in fade-in zoom-in-95 duration-150">
                    {/* Audio Waveform Indicator */}
                    <div className="flex items-center gap-0.5 text-emerald-400 h-3.5 shrink-0">
                      <span className="w-0.5 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="w-0.5 h-3.5 bg-emerald-400 rounded-full" />
                      <span className="w-0.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="w-0.5 h-1.5 bg-emerald-400 rounded-full" />
                    </div>

                    <div className="flex flex-col text-left flex-1 min-w-0">
                      <div className="flex items-center gap-1 font-medium truncate">
                        <span className="text-neutral-300 text-[11px]">
                          {pronunciationFeedback.status === 'unclear'
                            ? 'Kurang jelas — coba ulangi:'
                            : 'Coba ulangi:'}
                        </span>
                        <span className="text-emerald-400 font-semibold text-xs truncate">
                          {pronunciationFeedback.targetWord}
                        </span>
                      </div>

                      {pronunciationFeedback.detectedWord && (
                        <div className="text-[10px] text-[#6B7280] flex items-center gap-1.5 mt-0.5 font-mono truncate">
                          <span>Target: <span className="text-neutral-300">{pronunciationFeedback.targetWord}</span></span>
                          <span>•</span>
                          <span>Dikenali: <span className="text-amber-400">{pronunciationFeedback.detectedWord}</span></span>
                        </div>
                      )}
                    </div>

                    {/* Non-blocking skip button if attempt >= 2 */}
                    {pronunciationFeedback.allowSkip && onSkipCorrection && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSkipCorrection();
                        }}
                        className="px-2 py-1 text-[10px] font-medium bg-[#232323] hover:bg-[#2A2A2A] text-neutral-200 rounded-lg transition border border-[#383838] shrink-0"
                        title="Lewati kata ini dan lanjutkan"
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
                        className="p-1 text-neutral-500 hover:text-neutral-300 transition rounded shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-[#6B7280] font-normal text-lg tracking-wide font-mono">
            — Naskah Selesai —
          </p>
        )}
      </div>

      {/* 3. DOWNSTREAM CONTEXT WINDOW (Upcoming phrases at 45-55% and 30-40%) */}
      <div className={`w-full ${maxLineConstraint} text-center space-y-2.5 mt-3 sm:mt-5 pointer-events-auto`}>
        {nextChunks.map((chunk, idx) => {
          const isImmediate = idx === 0;
          // Immediate upcoming: 50–55%, Far upcoming: 32–40%
          const opacity = isImmediate ? 0.52 : 0.35;
          const fontSize = isImmediate ? nearContextFontSize : farContextFontSize;

          return (
            <p
              key={chunk.id}
              onClick={() => onSelectChunk && onSelectChunk(chunk.order)}
              className="text-[#A3A3A3] hover:text-[#F5F5F5] cursor-pointer font-normal tracking-tight transition-all duration-200 line-clamp-2"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: 1.28,
                opacity,
              }}
            >
              {chunk.text}
            </p>
          );
        })}

        {nextChunks.length === 0 && (
          <div className="pt-3 text-[#6B7280] text-[11px] font-mono tracking-widest uppercase">
            — Akhir Naskah —
          </div>
        )}
      </div>
    </div>
  );
};
