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
    <div className="py-4 border-b border-[#2A2A2A] hover:border-[#383838] transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
      <div className="flex-1 pr-4">
        <Link
          href={`/editor/${script.id}`}
          className="text-base font-medium text-[#F5F5F5] hover:text-emerald-400 transition block mb-1"
        >
          {script.title || 'Untitled Script'}
        </Link>
        <div className="flex items-center gap-4 text-xs font-mono text-[#A3A3A3]">
          <span>{metrics.totalWords} kata</span>
          <span>~{metrics.formattedDuration}</span>
          <span className="line-clamp-1 max-w-xs text-[#6B7280] hidden md:inline">
            {script.raw_text.slice(0, 50)}...
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`/editor/${script.id}`}
          className="p-2 text-[#A3A3A3] hover:text-[#F5F5F5] transition rounded-xl hover:bg-[#1A1A1A] border border-transparent hover:border-[#2A2A2A]"
          title="Buka Editor"
        >
          <Edit3 className="w-4 h-4" />
        </Link>

        <Link
          href={`/teleprompter/${script.id}`}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#22C55E] hover:bg-[#16A34A] text-neutral-950 font-semibold text-xs rounded-xl transition shadow-sm"
          title="Mulai Membaca"
        >
          <Play className="w-3 h-3 fill-current" />
          Baca
        </Link>

        <button
          onClick={() => onDelete(script.id)}
          className="opacity-0 group-hover:opacity-100 p-2 text-[#6B7280] hover:text-red-400 transition rounded-xl"
          title="Hapus"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
