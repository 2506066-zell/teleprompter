'use client';

import React from 'react';
import Link from 'next/link';
import { Play, Edit3, Trash2, Clock, AlignLeft } from 'lucide-react';
import { getScriptMetrics } from '@/lib/script/metrics';

export interface ScriptItem {
  id: string;
  title: string;
  raw_text: string;
  updated_at: string;
}

interface ScriptCardProps {
  script: ScriptItem;
  onDelete: (id: string) => void;
}

export const ScriptCard: React.FC<ScriptCardProps> = ({ script, onDelete }) => {
  const metrics = getScriptMetrics(script.raw_text);
  const formattedDate = new Date(script.updated_at).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="bg-neutral-900/70 border border-neutral-800/80 hover:border-neutral-700/80 rounded-2xl p-5 flex flex-col justify-between transition group shadow-sm">
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <Link
            href={`/editor/${script.id}`}
            className="text-lg font-bold text-white group-hover:text-blue-400 transition line-clamp-1"
          >
            {script.title || 'Untitled Script'}
          </Link>
          <button
            onClick={() => onDelete(script.id)}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-500 hover:text-rose-400 transition rounded-lg hover:bg-neutral-800"
            title="Hapus Skrip"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed mb-4">
          {script.raw_text || 'Skrip masih kosong...'}
        </p>
      </div>

      <div className="pt-3 border-t border-neutral-800/60 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-neutral-500 font-mono">
          <span className="flex items-center gap-1">
            <AlignLeft className="w-3.5 h-3.5" />
            {metrics.totalWords} kata
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {metrics.formattedDuration}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/editor/${script.id}`}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition"
            title="Buka Editor"
          >
            <Edit3 className="w-4 h-4" />
          </Link>

          <Link
            href={`/teleprompter/${script.id}`}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black font-semibold text-xs rounded-xl border border-emerald-500/20 hover:border-transparent transition shadow-sm"
            title="Mulai Membaca Teleprompter"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Baca
          </Link>
        </div>
      </div>
    </div>
  );
};
