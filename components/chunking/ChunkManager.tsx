'use client';

import React, { useState } from 'react';
import { Chunk } from '@/types/teleprompter';
import { splitChunk, mergeChunks, updateChunkText, createReadingChunks } from '@/lib/script/chunking';
import { Scissors, Combine, RefreshCw, Smartphone, Monitor } from 'lucide-react';

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
    <div className="space-y-4">
      {/* Header & Regenerate toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-neutral-900 border border-neutral-800 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Target Orientasi:
          </span>
          <div className="flex bg-neutral-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setTargetOrientation('portrait')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition ${
                targetOrientation === 'portrait'
                  ? 'bg-neutral-700 text-white font-medium shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Portrait (5–12 kata)
            </button>
            <button
              onClick={() => setTargetOrientation('landscape')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition ${
                targetOrientation === 'landscape'
                  ? 'bg-neutral-700 text-white font-medium shadow-sm'
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
          className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs rounded-lg transition font-medium border border-neutral-700"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Regenerate Chunks
        </button>
      </div>

      {/* Chunks List */}
      <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
        {chunks.map((chunk, index) => {
          const isSplitting = splittingChunkId === chunk.id;
          const words = chunk.text.split(/\s+/).filter(Boolean);

          return (
            <div
              key={chunk.id}
              className="p-3 bg-neutral-900/90 border border-neutral-800 rounded-xl transition hover:border-neutral-700/80 group"
            >
              <div className="flex items-center justify-between mb-1.5 text-xs text-neutral-500 font-mono">
                <span className="font-semibold text-neutral-400">Chunk #{index + 1}</span>
                <div className="flex items-center gap-3">
                  <span>{chunk.wordCount} kata</span>
                  <span>~{chunk.estimatedDuration.toFixed(1)}s</span>
                  <span className="text-[10px] bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-400">
                    Komp: {chunk.complexityScore.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Text Input / Editor for the chunk */}
              {!isSplitting ? (
                <textarea
                  rows={2}
                  value={chunk.text}
                  onChange={(e) => handleTextChange(index, e.target.value)}
                  className="w-full bg-neutral-950/60 border border-neutral-800 rounded-lg p-2 text-sm text-neutral-200 focus:outline-none focus:border-blue-500 transition resize-none"
                />
              ) : (
                /* Interactive Word Splitter */
                <div className="p-2.5 bg-neutral-950 border border-amber-500/40 rounded-lg mb-2">
                  <p className="text-xs text-amber-300 mb-2 font-medium">
                    Klik di antara kata untuk memecah chunk ini:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {words.map((w, wIdx) => (
                      <React.Fragment key={wIdx}>
                        <span className="text-xs text-neutral-300 font-mono bg-neutral-800/80 px-1.5 py-0.5 rounded">
                          {w}
                        </span>
                        {wIdx < words.length - 1 && (
                          <button
                            onClick={() => handleSplitAtWord(index, wIdx + 1)}
                            className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 hover:bg-amber-500 hover:text-black text-amber-300 rounded transition font-bold"
                            title="Potong di sini"
                          >
                            ✂
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

              {/* Actions: Split, Merge */}
              <div className="flex items-center justify-end gap-2 mt-2 pt-1 border-t border-neutral-800/60">
                <button
                  onClick={() => setSplittingChunkId(isSplitting ? null : chunk.id)}
                  disabled={words.length <= 1}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 bg-neutral-800/70 hover:bg-neutral-800 text-neutral-300 disabled:opacity-30 rounded transition"
                >
                  <Scissors className="w-3 h-3" />
                  Split
                </button>

                {index < chunks.length - 1 && (
                  <button
                    onClick={() => handleMerge(index)}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 bg-neutral-800/70 hover:bg-neutral-800 text-neutral-300 rounded transition"
                  >
                    <Combine className="w-3 h-3" />
                    Merge Bawah
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
