'use client';

import React, { useState } from 'react';
import { Chunk } from '@/types/teleprompter';
import { splitChunk, mergeChunks, updateChunkText, createReadingChunks } from '@/lib/script/chunking';
import { Scissors, Combine, RotateCcw, Smartphone, Monitor } from 'lucide-react';

interface ChunkManagerProps {
  chunks: Chunk[];
  rawScript: string;
  onChunksChange: (chunks: Chunk[]) => void;
  wpm?: number;
}

export const ChunkManager: React.FC<ChunkManagerProps> = ({
  chunks,
  rawScript,
  onChunksChange,
  wpm = 140,
}) => {
  const [targetOrientation, setTargetOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [splittingChunkId, setSplittingChunkId] = useState<string | null>(null);

  const handleRegenerate = () => {
    const freshChunks = createReadingChunks(rawScript, targetOrientation, wpm);
    onChunksChange(freshChunks);
  };

  const handleTextChange = (index: number, newText: string) => {
    const updated = updateChunkText(chunks, index, newText, wpm);
    onChunksChange(updated);
  };

  const handleMerge = (index: number) => {
    const merged = mergeChunks(chunks, index, wpm);
    onChunksChange(merged);
  };

  const handleSplitAtWord = (chunkIndex: number, wordIndex: number) => {
    const splitted = splitChunk(chunks, chunkIndex, wordIndex, wpm);
    onChunksChange(splitted);
    setSplittingChunkId(null);
  };

  return (
    <div className="space-y-6">
      {/* Rhythm calibration bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-800/80">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">
            Ritme Tampilan:
          </span>
          <div className="flex bg-neutral-900 rounded-lg p-0.5 text-xs border border-neutral-800">
            <button
              onClick={() => setTargetOrientation('portrait')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition font-medium ${
                targetOrientation === 'portrait'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Portrait (5–12 kata)
            </button>
            <button
              onClick={() => setTargetOrientation('landscape')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition font-medium ${
                targetOrientation === 'landscape'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              Landscape (7–16 kata)
            </button>
          </div>
        </div>

        <button
          onClick={handleRegenerate}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white py-1 px-3 rounded-lg hover:bg-neutral-900 transition font-mono"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Hitung Ulang Unit Bacaan
        </button>
      </div>

      {/* Rhythmic Speech Unit Flow (No heavy card boxes) */}
      <div className="space-y-3 max-h-[580px] overflow-y-auto pr-2">
        {chunks.map((chunk, index) => {
          const isSplitting = splittingChunkId === chunk.id;
          const words = chunk.text.split(/\s+/).filter(Boolean);
          const hasSentencePause = /[.!?]$/.test(chunk.text);

          return (
            <div
              key={chunk.id}
              className="py-3 px-4 rounded-xl border border-neutral-900 hover:border-neutral-800/80 bg-neutral-950/40 hover:bg-neutral-900/30 transition group"
            >
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 mb-1.5">
                <span className="text-neutral-400">Unit #{index + 1}</span>
                <div className="flex items-center gap-3">
                  <span>{chunk.wordCount} kata</span>
                  <span>~{chunk.estimatedDuration.toFixed(1)}s</span>
                  {hasSentencePause && (
                    <span className="text-[10px] text-neutral-400 bg-neutral-900 px-1.5 py-0.5 rounded">
                      Jeda Napas
                    </span>
                  )}
                </div>
              </div>

              {!isSplitting ? (
                <textarea
                  rows={2}
                  value={chunk.text}
                  onChange={(e) => handleTextChange(index, e.target.value)}
                  className="w-full bg-transparent text-sm text-neutral-200 focus:outline-none focus:text-white transition resize-none leading-relaxed font-sans"
                />
              ) : (
                /* Interactive word break tool */
                <div className="p-3 bg-neutral-900 rounded-xl my-2 border border-neutral-700/60">
                  <p className="text-[11px] text-neutral-300 font-mono mb-2">
                    Pilih batas potong napas di antara kata:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {words.map((w, wIdx) => (
                      <React.Fragment key={wIdx}>
                        <span className="text-xs text-neutral-200 bg-neutral-800 px-2 py-0.5 rounded">
                          {w}
                        </span>
                        {wIdx < words.length - 1 && (
                          <button
                            onClick={() => handleSplitAtWord(index, wIdx + 1)}
                            className="px-2 py-0.5 text-xs bg-neutral-700 hover:bg-neutral-200 hover:text-black text-neutral-300 rounded font-mono font-bold transition"
                            title="Potong di sini"
                          >
                            /
                          </button>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  <button
                    onClick={() => setSplittingChunkId(null)}
                    className="mt-2 text-[11px] text-neutral-400 hover:text-white"
                  >
                    Batal
                  </button>
                </div>
              )}

              {/* Quiet Micro actions */}
              <div className="flex items-center justify-end gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setSplittingChunkId(isSplitting ? null : chunk.id)}
                  disabled={words.length <= 1}
                  className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white transition disabled:opacity-20"
                >
                  <Scissors className="w-3 h-3" />
                  Bagi Dua (Split)
                </button>

                {index < chunks.length - 1 && (
                  <button
                    onClick={() => handleMerge(index)}
                    className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white transition"
                  >
                    <Combine className="w-3 h-3" />
                    Gabung Kalimat Bawah
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
