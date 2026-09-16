'use client';

import React from 'react';
import { CognitiveState } from '@/types/teleprompter';

interface TrackingStatusBarProps {
  cognitiveState: CognitiveState;
  elapsedSeconds?: number;
  currentChunkDuration?: number;
  visible?: boolean;
}

export const TrackingStatusBar: React.FC<TrackingStatusBarProps> = ({
  cognitiveState,
  elapsedSeconds = 0,
  currentChunkDuration = 1,
  visible = true,
}) => {
  if (!visible) return null;

  // Gentle, calm text labels without robotic error badges
  const stateLabels: Record<string, { text: string; dotClass: string }> = {
    READY: { text: 'Siap', dotClass: 'bg-neutral-600' },
    LISTENING: { text: 'Mendengarkan', dotClass: 'bg-emerald-500/70' },
    FOLLOWING: { text: 'Mengikuti', dotClass: 'bg-emerald-400 animate-pulse' },
    PREDICTING: { text: 'Memprediksi', dotClass: 'bg-cyan-400 animate-pulse' },
    THINKING: { text: 'Menunggu', dotClass: 'bg-amber-400' },
    UNCERTAIN: { text: 'Menyelaraskan', dotClass: 'bg-yellow-400' },
    RECOVERING: { text: 'Memulihkan', dotClass: 'bg-sky-400 animate-pulse' },
    CORRECTING: { text: 'Koreksi', dotClass: 'bg-rose-400' },
    PAUSED: { text: 'Jeda', dotClass: 'bg-neutral-600' },
    FINISHED: { text: 'Selesai', dotClass: 'bg-neutral-700' },
  };

  const key = (cognitiveState || 'READY').toUpperCase();
  const stateConfig = stateLabels[key] || stateLabels.READY;

  // Subtle progress metric on active chunk
  const progressRatio = Math.min(1, Math.max(0, elapsedSeconds / Math.max(0.1, currentChunkDuration)));

  return (
    <div className="fixed top-4 right-5 z-30 pointer-events-none flex items-center gap-3 transition-opacity duration-500">
      {/* Tiny quiet progress line (only 32px wide, extremely discreet) */}
      <div className="w-8 h-[2px] bg-neutral-800/80 rounded-full overflow-hidden">
        <div
          className="h-full bg-neutral-400 transition-all duration-100 ease-linear rounded-full"
          style={{ width: `${progressRatio * 100}%` }}
        />
      </div>

      {/* Ambient state dot + quiet label */}
      <div className="flex items-center gap-1.5 text-[11px] font-mono tracking-wider text-neutral-400 uppercase select-none">
        <span className={`w-1.5 h-1.5 rounded-full ${stateConfig.dotClass}`} />
        <span className="opacity-70">{stateConfig.text}</span>
      </div>
    </div>
  );
};
