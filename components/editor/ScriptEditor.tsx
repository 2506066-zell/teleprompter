'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Chunk } from '@/types/teleprompter';
import { getScriptMetrics } from '@/lib/script/metrics';
import { createReadingChunks } from '@/lib/script/chunking';
import { ChunkManager } from '@/components/chunking/ChunkManager';
import { Play, Check, Cloud, AlertCircle, ArrowLeft } from 'lucide-react';

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
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top Quiet Bar */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-neutral-900">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 text-neutral-500 hover:text-white transition"
            title="Kembali ke Naskah"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-3 text-xs font-mono text-neutral-500">
            <span>{saveStatus === 'saving' ? 'Menyimpan...' : saveStatus === 'saved' ? 'Tersimpan' : 'Belum disimpan'}</span>
          </div>
        </div>

        <Link
          href={`/teleprompter/${scriptId}`}
          className="flex items-center gap-2 px-5 py-2.5 bg-neutral-100 hover:bg-white text-neutral-950 font-medium text-xs rounded-full transition shadow-md active:scale-95"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Mulai Membaca
        </Link>
      </div>

      {/* Local Draft Recovery Banner */}
      {hasDraft && (
        <div className="flex items-center justify-between p-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-300">
          <span>Draf lokal tersimpan terdeteksi.</span>
          <div className="flex gap-2">
            <button
              onClick={onRestoreDraft}
              className="text-white hover:underline font-medium"
            >
              Pulihkan
            </button>
            <button
              onClick={onDiscardDraft}
              className="text-neutral-500 hover:text-neutral-300"
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
          placeholder="Judul Naskah"
          className="w-full bg-transparent text-2xl sm:text-3xl font-medium text-white placeholder-neutral-700 focus:outline-none tracking-tight transition"
        />
      </div>

      {/* Clean Metrics Strip */}
      <div className="flex items-center gap-6 text-xs font-mono text-neutral-500">
        <div>{metrics.totalWords} kata</div>
        <div>~{metrics.formattedDuration}</div>
        <div>{chunks.length} unit napas</div>
      </div>

      {/* Minimal Tabs */}
      <div className="flex items-center gap-4 text-xs font-mono border-b border-neutral-900 pb-2">
        <button
          onClick={() => setActiveTab('editor')}
          className={`transition ${activeTab === 'editor' ? 'text-white font-medium' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          Teks Lengkap
        </button>
        <button
          onClick={() => setActiveTab('chunks')}
          className={`transition ${activeTab === 'chunks' ? 'text-white font-medium' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          Unit Aliran Bacaan ({chunks.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'editor' ? (
        <div className="space-y-2">
          <textarea
            rows={14}
            value={rawText}
            onChange={handleRawTextChange}
            placeholder="Tuliskan naskah video Anda di sini. Gunakan baris baru dan tanda baca alami untuk memisahkan alur napas..."
            className="w-full bg-transparent text-neutral-200 placeholder-neutral-700 focus:outline-none text-base sm:text-lg leading-relaxed font-sans resize-y"
          />
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
