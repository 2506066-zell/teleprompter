'use client';

import React, { useMemo } from 'react';
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
  captionMode = 'word_follow',
  settings,
  pronunciationFeedback,
  onSkipCorrection,
  onClearPronunciationFeedback,
  onSelectChunk,
  isLandscape = false,
}) => {
  const currentChunk = chunks[currentIndex] || null;

  // Peripheral context phrases: up to 2 upstream and 2 downstream
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

  // Maximum width constrained for optimal reading column width (matching reference screenshot)
  const maxLineConstraint =
    settings.lineLength === 'compact'
      ? 'max-w-[300px]'
      : settings.lineLength === 'wide'
      ? 'max-w-xl'
      : 'max-w-[340px] sm:max-w-[380px]';

  // Camera-Proximity Focus Zone: anchors the active reading text near the lens
  const verticalAlignmentClass =
    settings.focusPosition === 'lens_proximity'
      ? isLandscape
        ? 'pt-8 sm:pt-10 pb-20 justify-start'
        : 'pt-12 sm:pt-16 pb-28 justify-start'
      : 'justify-center py-8';

  // Typography Metrics: 32–36px for active phrase, 1.28 line-height
  const activeFontSize = Math.min(42, Math.max(28, settings.fontSize));
  const nearContextFontSize = Math.max(19, Math.round(activeFontSize * 0.62));
  const farContextFontSize = Math.max(16, Math.round(activeFontSize * 0.52));

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
      className={`relative flex flex-col items-center w-full h-full px-5 sm:px-8 select-none overflow-hidden font-sans ${verticalAlignmentClass}`}
      style={mirrorStyle}
    >
      {/* 1. UPSTREAM CONTEXT WINDOW (Left-aligned, Opacity ~0.35 & 0.65) */}
      <div className={`w-full ${maxLineConstraint} text-left space-y-4 mb-4 sm:mb-6 pointer-events-auto transition-opacity duration-200`}>
        {prevChunks.map((chunk, idx) => {
          const isImmediate = idx === prevChunks.length - 1;
          const opacity = isImmediate ? 0.65 : 0.35;
          const fontSize = isImmediate ? nearContextFontSize : farContextFontSize;

          return (
            <p
              key={chunk.id}
              onClick={() => onSelectChunk && onSelectChunk(chunk.order)}
              className="text-[#A1A7B3] hover:text-[#F5F7FA] cursor-pointer font-normal tracking-tight transition-all duration-200 leading-[1.35]"
              style={{
                fontSize: `${fontSize}px`,
                opacity,
              }}
            >
              {chunk.text}
            </p>
          );
        })}
      </div>

      {/* 2. CAMERA-PROXIMITY ACTIVE FOCUS ZONE (Left-aligned, Frozen Geometry, Zero Reflow) */}
      <div className={`w-full ${maxLineConstraint} text-left my-2 relative z-10`}>
        {currentChunk ? (
          <div className="relative w-full">
            {/*
              CRITICAL ZERO-REFLOW & STABLE GEOMETRY:
              - text-left gives a rock-solid horizontal anchor for the speaker's eyes.
              - Every word token maintains EXACT constant padding (px-2 py-0.5 my-0.5 mx-0.5) and CONSTANT 1px border.
              - Active word switches background-color and border-color to soft emerald without changing width or margins.
              - Line breaks and word positions are 100% frozen!
            */}
            <h1
              className="tracking-[-0.015em] text-[#F5F7FA] font-semibold antialiased leading-[1.28]"
              style={{
                fontSize: `${activeFontSize}px`,
              }}
            >
              {captionMode === 'cinematic_minimal' ? (
                /* Cinematic Minimal Mode */
                <span className="inline text-[#F5F7FA] font-medium leading-[1.28]">
                  {currentChunk.text}
                </span>
              ) : (
                /* Dynamic Caption Mode (Word Follow & Phrase Focus with Soft Emerald Pill) */
                <span className="inline leading-[1.32]">
                  {currentWords.map((word, wIdx) => {
                    const isActive = wIdx === activeWordIndex;
                    const isPast = wIdx < activeWordIndex;
                    const isImportant = isWordImportant(word);

                    return (
                      <span
                        key={wIdx}
                        className={`inline-block px-2 py-0.5 my-0.5 mx-0.5 rounded-lg border font-semibold transition-colors duration-150 ease-out ${
                          isActive
                            ? 'bg-emerald-500/25 border-emerald-400/40 text-[#86EFAC]'
                            : isPast
                            ? 'bg-transparent border-transparent text-[#F5F7FA] opacity-95'
                            : 'bg-transparent border-transparent text-[#F5F7FA] opacity-90'
                        } ${isImportant && !isActive ? 'underline decoration-emerald-500/40 underline-offset-4' : ''}`}
                      >
                        {word}
                      </span>
                    );
                  })}
                </span>
              )}
            </h1>

            {/* Natural punctuation pause indicator */}
            {/[.!?]$/.test(currentChunk.text) && (
              <span className="inline-block ml-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400/70 align-middle" />
            )}

            {/* Pronunciation Feedback Overlay (Zero layout push) */}
            {pronunciationFeedback && pronunciationFeedback.status !== 'none' && (
              <div className="mt-4 flex flex-col items-start">
                {pronunciationFeedback.status === 'correct' ? (
                  <div className="bg-[#171A1F] border border-emerald-500/40 rounded-xl px-4 py-2 shadow-xl flex items-center justify-between gap-3 text-xs min-w-[240px] animate-in fade-in duration-150">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1 bg-emerald-950/80 text-emerald-400 rounded-md border border-emerald-500/30">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                      <div className="text-left">
                        <div className="text-[#F5F7FA] font-semibold text-xs">
                          {pronunciationFeedback.targetWord}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-mono">
                          Pengucapan jelas • Lanjut...
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#171A1F] border border-[#2A2E34] rounded-xl px-4 py-2.5 shadow-xl flex items-center justify-between gap-3 text-xs min-w-[260px] max-w-sm animate-in fade-in duration-150">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-rose-950/60 text-rose-400 rounded-md border border-rose-500/30">
                        <div className="flex items-center gap-0.5 h-3.5">
                          <span className="w-0.5 h-2 bg-rose-400 rounded-full animate-pulse" />
                          <span className="w-0.5 h-3.5 bg-rose-400 rounded-full" />
                          <span className="w-0.5 h-2 bg-rose-400 rounded-full animate-pulse" />
                        </div>
                      </div>

                      <div className="text-left">
                        <div className="text-[#F5F7FA] font-semibold text-xs flex items-center gap-1.5">
                          <span className="text-rose-400 line-through opacity-80 text-[11px]">
                            {pronunciationFeedback.detectedWord || '...'}
                          </span>
                          <span className="text-[#F5F7FA] font-bold">
                            {pronunciationFeedback.targetWord}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#A1A7B3]">
                          {pronunciationFeedback.status === 'unclear'
                            ? 'Kurang jelas — coba ulangi'
                            : `Coba ulangi: ${pronunciationFeedback.targetWord}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {pronunciationFeedback.allowSkip && onSkipCorrection && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSkipCorrection();
                          }}
                          className="px-2 py-0.5 text-[10px] font-semibold bg-[#1F242A] hover:bg-[#2A2E34] text-neutral-200 rounded transition border border-[#2A2E34]"
                          title="Lewati kata ini"
                        >
                          Lanjut →
                        </button>
                      )}

                      {onClearPronunciationFeedback && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onClearPronunciationFeedback();
                          }}
                          className="p-1 text-[#6B7280] hover:text-[#F5F7FA] transition rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-[#6B7280] font-normal text-sm tracking-wide font-mono">
            — Naskah Selesai —
          </p>
        )}
      </div>

      {/* 3. DOWNSTREAM CONTEXT WINDOW (Left-aligned, Opacity ~0.35 & 0.20) */}
      <div className={`w-full ${maxLineConstraint} text-left space-y-4 mt-4 sm:mt-6 pointer-events-auto transition-opacity duration-200`}>
        {nextChunks.map((chunk, idx) => {
          const isImmediate = idx === 0;
          const opacity = isImmediate ? 0.35 : 0.20;
          const fontSize = isImmediate ? nearContextFontSize : farContextFontSize;

          return (
            <p
              key={chunk.id}
              onClick={() => onSelectChunk && onSelectChunk(chunk.order)}
              className="text-[#A1A7B3] hover:text-[#F5F7FA] cursor-pointer font-normal tracking-tight transition-all duration-200 leading-[1.35]"
              style={{
                fontSize: `${fontSize}px`,
                opacity,
              }}
            >
              {chunk.text}
            </p>
          );
        })}

        {nextChunks.length === 0 && (
          <div className="pt-2 text-[#6B7280] text-[10px] font-mono tracking-widest uppercase">
            — Akhir Naskah —
          </div>
        )}
      </div>
    </div>
  );
};
