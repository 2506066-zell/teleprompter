'use client';

import React from 'react';
import { Chunk, TeleprompterSettings, DynamicCaptionMode } from '@/types/teleprompter';

interface FocusZoneProps {
  chunks: Chunk[];
  currentIndex: number;
  activeWordIndex?: number;
  captionMode?: DynamicCaptionMode;
  settings: TeleprompterSettings;
  onSelectChunk?: (index: number) => void;
  isLandscape?: boolean;
}

export const FocusZone: React.FC<FocusZoneProps> = ({
  chunks,
  currentIndex,
  activeWordIndex = 0,
  captionMode = 'phrase_focus',
  settings,
  onSelectChunk,
  isLandscape = false,
}) => {
  const currentChunk = chunks[currentIndex] || null;

  // Context phrases (up to 2 previous and 2 next for continuous natural flow)
  const prevChunks = [
    currentIndex >= 2 ? chunks[currentIndex - 2] : null,
    currentIndex >= 1 ? chunks[currentIndex - 1] : null,
  ].filter(Boolean) as Chunk[];

  const nextChunks = [
    currentIndex + 1 < chunks.length ? chunks[currentIndex + 1] : null,
    currentIndex + 2 < chunks.length ? chunks[currentIndex + 2] : null,
  ].filter(Boolean) as Chunk[];

  const mirrorStyle = settings.mirrorMode ? { transform: 'scaleX(-1)' } : undefined;

  // Optimal line length constraint: 35–55 characters per visual line
  const maxLineConstraint =
    settings.lineLength === 'compact'
      ? 'max-w-md'
      : settings.lineLength === 'wide'
      ? 'max-w-2xl'
      : 'max-w-xl';

  // Camera awareness vertical positioning
  const verticalAlignmentClass =
    settings.focusPosition === 'lens_proximity'
      ? isLandscape
        ? 'pt-14 sm:pt-16 pb-28 justify-start'
        : 'pt-20 sm:pt-24 pb-36 justify-start'
      : 'justify-center py-12';

  // Active word accent styling based on settings
  const getActiveWordStyle = () => {
    switch (settings.highlightAccent) {
      case 'soft_cyan':
        return 'text-sky-300 bg-sky-950/40 px-1 py-0.5 rounded';
      case 'pure_white':
        return 'text-white underline decoration-neutral-500 underline-offset-4';
      case 'subtle_amber':
      default:
        return 'text-amber-200 bg-amber-950/30 px-1 py-0.5 rounded';
    }
  };

  // Words of the active chunk
  const currentWords = currentChunk ? currentChunk.text.split(/\s+/).filter(Boolean) : [];

  return (
    <div
      className={`relative flex flex-col items-center w-full h-full px-4 select-none overflow-hidden transition-all duration-500 ease-out ${verticalAlignmentClass}`}
      style={mirrorStyle}
    >
      {/* 1. Previous Context Window (Fades out softly into the top void) */}
      <div className={`w-full ${maxLineConstraint} text-center space-y-3 mb-4 sm:mb-6 pointer-events-auto`}>
        {prevChunks.map((chunk, idx) => {
          const isImmediate = idx === prevChunks.length - 1;
          const isCinematic = captionMode === 'cinematic_minimal';
          const opacity = isCinematic ? (isImmediate ? 0.2 : 0.08) : isImmediate ? 0.3 : 0.14;
          const fontSize = Math.max(16, Math.round(settings.fontSize * (isImmediate ? 0.62 : 0.52)));

          return (
            <p
              key={chunk.id}
              onClick={() => onSelectChunk && onSelectChunk(chunk.order)}
              className="text-neutral-400 hover:text-neutral-200 cursor-pointer font-normal tracking-tight transition-all duration-300 line-clamp-2"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: 1.45,
                opacity,
              }}
            >
              {chunk.text}
            </p>
          );
        })}
      </div>

      {/* 2. THE DYNAMIC CAPTION FOCUS ZONE (Primary Fixation Area) */}
      <div className={`w-full ${maxLineConstraint} text-center my-2 sm:my-3 relative z-10 transition-transform duration-300 ease-out`}>
        {currentChunk ? (
          <div className="relative inline-block px-3 py-1">
            <h1
              className="tracking-[-0.015em] transition-all duration-200 antialiased font-medium"
              style={{
                fontSize: `${settings.fontSize}px`,
                lineHeight: 1.45,
              }}
            >
              {captionMode === 'word_follow' ? (
                /* Dynamic Caption Word-Follow Mode */
                <span className="flex flex-wrap justify-center gap-x-1.5 gap-y-1">
                  {currentWords.map((word, wIdx) => {
                    const isPast = wIdx < activeWordIndex;
                    const isActive = wIdx === activeWordIndex;
                    const isUpcoming = wIdx > activeWordIndex;

                    return (
                      <span
                        key={wIdx}
                        className={`transition-colors duration-150 inline-block ${
                          isActive
                            ? `${getActiveWordStyle()} font-semibold scale-[1.02]`
                            : isPast
                            ? 'text-neutral-200 opacity-90'
                            : 'text-neutral-500 opacity-70'
                        }`}
                      >
                        {word}
                      </span>
                    );
                  })}
                </span>
              ) : captionMode === 'cinematic_minimal' ? (
                /* Cinematic Minimal Mode */
                <span className="text-white font-normal leading-relaxed">
                  {currentChunk.text}
                </span>
              ) : (
                /* Default Phrase Focus Mode */
                <span className="text-neutral-50 font-medium leading-relaxed">
                  {currentChunk.text}
                </span>
              )}
            </h1>

            {/* Subtle natural pause indicator */}
            {/[.!?]$/.test(currentChunk.text) && (
              <span className="inline-block ml-2 w-1.5 h-1.5 rounded-full bg-neutral-600 align-middle opacity-50" />
            )}
          </div>
        ) : (
          <p className="text-neutral-600 font-normal text-xl italic tracking-wide">
            — Naskah Selesai —
          </p>
        )}
      </div>

      {/* 3. Next Context Window (Dimmed downstream preview for speech preparation) */}
      <div className={`w-full ${maxLineConstraint} text-center space-y-3 mt-4 sm:mt-6 pointer-events-auto`}>
        {nextChunks.map((chunk, idx) => {
          const isImmediate = idx === 0;
          const isCinematic = captionMode === 'cinematic_minimal';
          const opacity = isCinematic ? (isImmediate ? 0.25 : 0.1) : isImmediate ? 0.38 : 0.18;
          const fontSize = Math.max(16, Math.round(settings.fontSize * (isImmediate ? 0.64 : 0.54)));

          return (
            <p
              key={chunk.id}
              onClick={() => onSelectChunk && onSelectChunk(chunk.order)}
              className="text-neutral-400 hover:text-neutral-200 cursor-pointer font-normal tracking-tight transition-all duration-300 line-clamp-2"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: 1.45,
                opacity,
              }}
            >
              {chunk.text}
            </p>
          );
        })}

        {nextChunks.length === 0 && (
          <div className="pt-4 text-neutral-700 text-xs font-mono tracking-widest uppercase">
            — Selesai —
          </div>
        )}
      </div>
    </div>
  );
};
