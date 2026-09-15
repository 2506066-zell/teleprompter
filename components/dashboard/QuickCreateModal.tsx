'use client';

import React, { useState } from 'react';
import { X, Sparkles, FilePlus } from 'lucide-react';
import { SAMPLE_SCRIPTS } from '@/constants/defaults';

interface QuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, rawText: string) => Promise<void>;
}

export const QuickCreateModal: React.FC<QuickCreateModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    try {
      setIsLoading(true);
      await onCreate(title.trim() || 'Untitled Script', rawText.trim());
      onClose();
    } catch {
      setIsLoading(false);
    }
  };

  const loadSample = (sample: typeof SAMPLE_SCRIPTS[0]) => {
    setTitle(sample.title);
    setRawText(sample.text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-neutral-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
            <FilePlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Buat Skrip Baru</h2>
            <p className="text-xs text-neutral-400">Tulis naskah atau mulai dari contoh template</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Judul Skrip</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Pembukaan Video YouTube Minggu Ini"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition placeholder-neutral-600"
              autoFocus
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-neutral-400">Isi Naskah</label>
              <button
                type="button"
                onClick={() => loadSample(SAMPLE_SCRIPTS[0])}
                className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-medium transition"
              >
                <Sparkles className="w-3 h-3" />
                Gunakan Naskah Contoh
              </button>
            </div>
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Ketik naskah di sini (bisa diedit kapan saja)..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-neutral-200 focus:outline-none focus:border-blue-500 transition resize-none placeholder-neutral-600 font-sans"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {isLoading ? 'Membuat...' : 'Buat Skrip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
