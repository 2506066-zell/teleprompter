'use client';

import React from 'react';
import Link from 'next/link';
import { Play, Edit3, Trash2 } from 'lucide-react';
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

  return (
    <div className="py-4 border-b border-neutral-900 hover:border-neutral-800 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
      <div className="flex-1 pr-4">
        <Link
          href={`/editor/${script.id}`}
          className="text-base font-medium text-white hover:text-neutral-300 transition block mb-1"
        >
          {script.title || 'Untitled Script'}
        </Link>
        <div className="flex items-center gap-4 text-xs font-mono text-neutral-500">
          <span>{metrics.totalWords} kata</span>
          <span>~{metrics.formattedDuration}</span>
          <span className="line-clamp-1 max-w-xs text-neutral-600 hidden md:inline">
            {script.raw_text.slice(0, 50)}...
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`/editor/${script.id}`}
          className="p-2 text-neutral-500 hover:text-white transition rounded-lg hover:bg-neutral-900"
          title="Buka Editor"
        >
          <Edit3 className="w-4 h-4" />
        </Link>

        <Link
          href={`/teleprompter/${script.id}`}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-neutral-100 hover:bg-white text-neutral-950 font-medium text-xs rounded-full transition"
          title="Mulai Membaca"
        >
          <Play className="w-3 h-3 fill-current" />
          Baca
        </Link>

        <button
          onClick={() => onDelete(script.id)}
          className="opacity-0 group-hover:opacity-100 p-2 text-neutral-600 hover:text-neutral-400 transition rounded-lg"
          title="Hapus"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
