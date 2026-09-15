'use client';

import React from 'react';
import { Chunk, TeleprompterSettings } from '@/types/teleprompter';

interface FocusZoneProps {
  chunks: Chunk[];
  currentIndex: number;
  settings: TeleprompterSettings;
  onSelectChunk?: (index: number) => void;
  isLandscape?: boolean;
}

export const FocusZone: React.FC<FocusZoneProps> = ({
  chunks,
  currentIndex,
  settings,
  onSelectChunk,
  isLandscape = false,
}) => {
  const currentChunk = chunks[currentIndex] || null;

  // Render context chunks (up to 2 previous and 2 next for continuous natural flow)
  const prevChunks = [
    currentIndex >= 2 ? chunks[currentIndex - 2] : null,
    currentIndex >= 1 ? chunks[currentIndex - 1] : null,
  ].filter(Boolean) as Chunk[];

  const nextChunks = [
    currentIndex + 1 < chunks.length ? chunks[currentIndex + 1] : null,
    currentIndex + 2 < chunks.length ? chunks[currentIndex + 2] : null,
  ].filter(Boolean) as Chunk[];

  const mirrorStyle = settings.mirrorMode ? { transform: 'scaleX(-1)' } : undefined;

  // Max width constrained for 35-55 characters per visual line
  const maxLineConstraint =
    settings.lineLength === 'compact'
      ? 'max-w-md'
      : settings.lineLength === 'wide'
      ? 'max-w-2xl'
      : 'max-w-xl';

  // Camera awareness vertical positioning
  // 'lens_proximity' shifts focus zone towards the top (near camera on smartphone portrait or top bar)
  const verticalAlignmentClass =
    settings.focusPosition === 'lens_proximity'
      ? isLandscape
        ? 'pt-16 sm:pt-20 pb-28 justify-start'
        : 'pt-20 sm:pt-28 pb-36 justify-start'
      : 'justify-center py-12';

  return (
    <div
      className={`relative flex flex-col items-center w-full h-full px-4 select-none overflow-hidden transition-all duration-500 ease-out ${verticalAlignmentClass}`}
      style={mirrorStyle}
    >
      {/* 1. Previous Context Window (Fades out softly into the top void) */}
      <div className={`w-full ${maxLineConstraint} text-center space-y-3 mb-4 sm:mb-6 pointer-events-auto`}>
        {prevChunks.map((chunk, idx) => {
          const isImmediate = idx === prevChunks.length - 1;
          const opacity = isImmediate ? 0.28 : 0.12;
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

      {/* 2. THE ACTIVE FOCUS WINDOW (Primary Fixation Zone) */}
      <div className={`w-full ${maxLineConstraint} text-center my-2 sm:my-3 relative z-10 transition-transform duration-300 ease-out`}>
        {currentChunk ? (
          <div className="relative inline-block px-3 py-1">
            {/* Active text: Medium/Semibold, generous line-height, highest luminance white, zero artificial card borders */}
            <h1
              className="text-neutral-50 font-medium tracking-[-0.015em] transition-all duration-200 antialiased"
              style={{
                fontSize: `${settings.fontSize}px`,
                lineHeight: 1.45,
              }}
            >
              {currentChunk.text}
            </h1>

            {/* Subtle natural punctuation pause indicator if clause contains pause */}
            {/[.!?]$/.test(currentChunk.text) && (
              <span className="inline-block ml-1.5 w-1.5 h-1.5 rounded-full bg-neutral-600 align-middle opacity-60" />
            )}
          </div>
        ) : (
          <p className="text-neutral-600 font-normal text-xl italic tracking-wide">
            — Naskah Selesai —
          </p>
        )}
      </div>

      {/* 3. Next Preview Context Window (Dimmed downstream preview for speech preparation) */}
      <div className={`w-full ${maxLineConstraint} text-center space-y-3 mt-4 sm:mt-6 pointer-events-auto`}>
        {nextChunks.map((chunk, idx) => {
          const isImmediate = idx === 0;
          const opacity = isImmediate ? 0.38 : 0.18;
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
            — Akhir Kalimat —
          </div>
        )}
      </div>
    </div>
  );
};
