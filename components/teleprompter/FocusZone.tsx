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
  const prevChunk = currentIndex > 0 ? chunks[currentIndex - 1] : null;
  const currentChunk = chunks[currentIndex] || null;
  const nextChunk = currentIndex < chunks.length - 1 ? chunks[currentIndex + 1] : null;

  const mirrorStyle = settings.mirrorMode
    ? { transform: 'scaleX(-1)' }
    : undefined;

  return (
    <div
      className="relative flex flex-col justify-center items-center w-full h-full px-4 sm:px-8 select-none overflow-hidden"
      style={mirrorStyle}
    >
      {/* 1. Previous Context Chunk (Low Opacity context, non-competing) */}
      <div className="w-full max-w-4xl text-center mb-6 sm:mb-8 transition-all duration-300 pointer-events-auto">
        {prevChunk ? (
          <p
            onClick={() => onSelectChunk && onSelectChunk(currentIndex - 1)}
            className="text-neutral-500 hover:text-neutral-400 cursor-pointer font-medium tracking-wide transition-opacity line-clamp-2"
            style={{
              fontSize: `${Math.max(16, Math.round(settings.fontSize * 0.58))}px`,
              opacity: 0.35,
              lineHeight: 1.4,
            }}
          >
            {prevChunk.text}
          </p>
        ) : (
          <div
            className="h-6 sm:h-8"
            style={{
              fontSize: `${Math.max(16, Math.round(settings.fontSize * 0.58))}px`,
            }}
          />
        )}
      </div>

      {/* 2. Active Focus Zone & Chunk (The Hero) */}
      <div
        className="w-full max-w-5xl text-center my-2 sm:my-4 transition-all duration-300 relative z-10"
      >
        {currentChunk ? (
          <div className="relative inline-block px-4 py-2">
            <h1
              className="text-white font-bold tracking-normal transition-all duration-200"
              style={{
                fontSize: `${settings.fontSize}px`,
                lineHeight: 1.35,
                textShadow: '0 2px 20px rgba(0,0,0,0.8)',
              }}
            >
              {currentChunk.text}
            </h1>
          </div>
        ) : (
          <p className="text-neutral-500 italic text-2xl">Skrip kosong atau telah selesai.</p>
        )}
      </div>

      {/* 3. Next Preview Chunk (Dimmed, preview for speech preparation) */}
      <div className="w-full max-w-4xl text-center mt-6 sm:mt-8 transition-all duration-300 pointer-events-auto">
        {nextChunk ? (
          <p
            onClick={() => onSelectChunk && onSelectChunk(currentIndex + 1)}
            className="text-neutral-400 hover:text-neutral-300 cursor-pointer font-medium tracking-wide transition-opacity line-clamp-2"
            style={{
              fontSize: `${Math.max(16, Math.round(settings.fontSize * 0.65))}px`,
              opacity: 0.45,
              lineHeight: 1.4,
            }}
          >
            {nextChunk.text}
          </p>
        ) : (
          <p
            className="text-neutral-600 font-mono text-sm tracking-wider uppercase"
            style={{ opacity: 0.4 }}
          >
            — Akhir Skrip —
          </p>
        )}
      </div>
    </div>
  );
};
