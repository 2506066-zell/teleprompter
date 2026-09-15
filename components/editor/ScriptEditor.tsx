'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Chunk } from '@/types/teleprompter';
import { getScriptMetrics } from '@/lib/script/metrics';
import { createReadingChunks } from '@/lib/script/chunking';
import { ChunkManager } from '@/components/chunking/ChunkManager';
import { Play, Check, Cloud, AlertTriangle, FileText, Layers, ArrowLeft } from 'lucide-react';

interface ScriptEditorProps {
  scriptId: string;
  initialTitle: string;
  initialRawText: string;
  initialChunks?: Chunk[];
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';
  hasDraft?: boolean;
  onSave: (title: string, rawText: string, chunks: Chunk[]) => Promise<void>;
  onRestoreDraft?: () => void;
  onDiscardDraft?: () => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  scriptId,
  initialTitle,
  initialRawText,
  initialChunks,
  saveStatus,
  hasDraft = false,
  onSave,
  onRestoreDraft,
  onDiscardDraft,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [rawText, setRawText] = useState(initialRawText);
  const [chunks, setChunks] = useState<Chunk[]>(() => {
    if (initialChunks && initialChunks.length > 0) return initialChunks;
    return createReadingChunks(initialRawText, 'portrait');
  });

  const [activeTab, setActiveTab] = useState<'editor' | 'chunks'>('editor');

  const metrics = getScriptMetrics(rawText);

  const handleRawTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setRawText(text);
    const newChunks = createReadingChunks(text, 'portrait');
    setChunks(newChunks);
    onSave(title, text, newChunks);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    onSave(newTitle, rawText, chunks);
  };

  const handleChunksChange = (updatedChunks: Chunk[]) => {
    setChunks(updatedChunks);
    onSave(title, rawText, updatedChunks);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
              Script ID: {scriptId.slice(0, 8)}
            </span>
            {/* Autosave Status */}
            <div className="flex items-center gap-1.5 text-xs">
              {saveStatus === 'saving' ? (
                <span className="flex items-center gap-1 text-blue-400 font-mono">
                  <Cloud className="w-3.5 h-3.5 animate-pulse" /> Menyimpan...
                </span>
              ) : saveStatus === 'saved' ? (
                <span className="flex items-center gap-1 text-emerald-400 font-mono">
                  <Check className="w-3.5 h-3.5" /> Tersimpan
                </span>
              ) : saveStatus === 'unsaved' ? (
                <span className="flex items-center gap-1 text-neutral-400 font-mono">
                  Belum disimpan
                </span>
              ) : (
                <span className="flex items-center gap-1 text-rose-400 font-mono">
                  Gagal menyimpan
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Launch Teleprompter Button */}
          <Link
            href={`/teleprompter/${scriptId}`}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm rounded-xl transition shadow-lg shadow-emerald-500/10 active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            Buka Teleprompter
          </Link>
        </div>
      </div>

      {/* Local Draft Recovery Banner */}
      {hasDraft && (
        <div className="flex items-center justify-between p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-xl text-amber-200 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Terdapat draf lokal tersimpan yang belum disinkronkan ke server.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRestoreDraft}
              className="px-2.5 py-1 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-400 transition"
            >
              Pulihkan Draf
            </button>
            <button
              onClick={onDiscardDraft}
              className="px-2.5 py-1 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition"
            >
              Abaikan
            </button>
          </div>
        </div>
      )}

      {/* Title Input */}
      <div>
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Judul Skrip..."
          className="w-full bg-transparent text-2xl sm:text-3xl font-bold text-white placeholder-neutral-600 focus:outline-none border-b border-transparent focus:border-neutral-800 pb-2 transition"
        />
      </div>

      {/* Metrics Bar */}
      <div className="flex flex-wrap items-center gap-4 py-2 px-4 bg-neutral-900/60 border border-neutral-800/80 rounded-xl text-xs text-neutral-400 font-mono">
        <div>
          Kata: <span className="text-white font-semibold">{metrics.totalWords}</span>
        </div>
        <div>
          Karakter: <span className="text-white font-semibold">{metrics.totalCharacters}</span>
        </div>
        <div>
          Estimasi Durasi: <span className="text-emerald-400 font-semibold">{metrics.formattedDuration}</span> (140 WPM)
        </div>
        <div>
          Total Chunks: <span className="text-blue-400 font-semibold">{chunks.length}</span>
        </div>
      </div>

      {/* Mode Tabs: Raw Script Editor vs Smart Chunks Preview */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-1">
        <button
          onClick={() => setActiveTab('editor')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition ${
            activeTab === 'editor'
              ? 'bg-neutral-800 text-white font-semibold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Raw Script Editor
        </button>

        <button
          onClick={() => setActiveTab('chunks')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition ${
            activeTab === 'chunks'
              ? 'bg-neutral-800 text-white font-semibold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Smart Chunk Preview ({chunks.length})
        </button>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'editor' ? (
        <div className="space-y-2">
          <textarea
            rows={14}
            value={rawText}
            onChange={handleRawTextChange}
            placeholder="Tuliskan atau tempel naskah video Anda di sini..."
            className="w-full bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4 sm:p-6 text-base sm:text-lg text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-blue-500/60 leading-relaxed transition resize-y font-sans"
          />
          <p className="text-[11px] text-neutral-500">
            * Skrip otomatis dianalisis dan dipecah menjadi unit bacaan alami (*reading chunks*) secara real-time.
          </p>
        </div>
      ) : (
        <ChunkManager
          chunks={chunks}
          rawScript={rawText}
          onChunksChange={handleChunksChange}
        />
      )}
    </div>
  );
};
