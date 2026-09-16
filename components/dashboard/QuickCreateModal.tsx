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

        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <FilePlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#F5F7FA] tracking-tight">Buat Naskah Baru</h2>
            <p className="text-xs text-[#A1A7B3]">Tulis naskah atau mulai dari contoh template</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#A1A7B3] mb-1">Judul Naskah</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Pembukaan Video YouTube Minggu Ini"
              className="w-full bg-[#171A1F] border border-[#2A2E34] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F7FA] focus:outline-none focus:border-emerald-500 transition placeholder-[#6B7280]"
              autoFocus
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-[#A1A7B3]">Isi Naskah</label>
              <button
                type="button"
                onClick={() => loadSample(SAMPLE_SCRIPTS[0])}
                className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium transition"
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
              className="w-full bg-[#171A1F] border border-[#2A2E34] rounded-xl p-3 text-sm text-[#F5F7FA] focus:outline-none focus:border-emerald-500 transition resize-none placeholder-[#6B7280] font-sans"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#A1A7B3] hover:text-[#F5F7FA] rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-[#22C55E] hover:bg-[#16A34A] text-neutral-950 font-semibold text-xs rounded-xl transition shadow-md shadow-emerald-950/40 active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Membuat...' : 'Buat Naskah'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
