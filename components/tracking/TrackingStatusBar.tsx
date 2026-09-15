'use client';

import React from 'react';
import { Mic, MicOff, Camera, CameraOff, Eye, AlertCircle } from 'lucide-react';
import { VoiceStatus, FaceStatus } from '@/types/tracking';
import { TeleprompterMode } from '@/types/teleprompter';

interface TrackingStatusBarProps {
  mode: TeleprompterMode;
  voiceStatus: VoiceStatus;
  faceStatus: FaceStatus;
  lastHoldReason?: string;
  elapsedSeconds?: number;
  currentChunkDuration?: number;
}

export const TrackingStatusBar: React.FC<TrackingStatusBarProps> = ({
  mode,
  voiceStatus,
  faceStatus,
  lastHoldReason,
  elapsedSeconds = 0,
  currentChunkDuration = 1,
}) => {
  const showVoice = mode === 'voice_follow' || mode === 'adaptive';
  const showFace = mode === 'adaptive';

  // Progress percentage on the current chunk timer
  const progressPercent = Math.min(100, Math.max(0, (elapsedSeconds / Math.max(0.1, currentChunkDuration)) * 100));

  return (
    <div className="fixed top-3 inset-x-4 z-30 flex items-center justify-between pointer-events-none max-w-5xl mx-auto">
      {/* Left: Sensor badges */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Voice Badge */}
        {showVoice && (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border backdrop-blur-md transition-all ${
              voiceStatus === 'speaking'
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-400 animate-pulse'
                : voiceStatus === 'silence'
                ? 'bg-amber-950/70 border-amber-500/50 text-amber-300'
                : voiceStatus === 'listening'
                ? 'bg-sky-950/70 border-sky-500/50 text-sky-400'
                : voiceStatus === 'unsupported'
                ? 'bg-neutral-900/80 border-neutral-700 text-neutral-500'
                : 'bg-neutral-900/80 border-neutral-800 text-neutral-400'
            }`}
          >
            {voiceStatus === 'unsupported' ? (
              <>
                <MicOff className="w-3 h-3 text-neutral-500" />
                <span className="text-[10px]">Speech API Unsupported</span>
              </>
            ) : voiceStatus === 'silence' ? (
              <>
                <Mic className="w-3 h-3 text-amber-400" />
                <span className="text-[10px]">Voice: Silence (HOLD)</span>
              </>
            ) : voiceStatus === 'speaking' ? (
              <>
                <Mic className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px]">Voice: Speaking</span>
              </>
            ) : voiceStatus === 'listening' ? (
              <>
                <Mic className="w-3 h-3 text-sky-400 animate-pulse" />
                <span className="text-[10px]">Voice: Listening</span>
              </>
            ) : (
              <>
                <MicOff className="w-3 h-3" />
                <span className="text-[10px]">Voice: Off</span>
              </>
            )}
          </div>
        )}

        {/* Face Badge */}
        {showFace && (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border backdrop-blur-md transition-all ${
              faceStatus === 'active'
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-400'
                : faceStatus === 'thinking'
                ? 'bg-amber-950/70 border-amber-500/50 text-amber-300'
                : faceStatus === 'away'
                ? 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                : 'bg-neutral-900/80 border-neutral-800 text-neutral-400'
            }`}
          >
            {faceStatus === 'away' ? (
              <>
                <CameraOff className="w-3 h-3 text-rose-400" />
                <span className="text-[10px]">Face Away (Paused)</span>
              </>
            ) : faceStatus === 'thinking' ? (
              <>
                <Eye className="w-3 h-3 text-amber-400" />
                <span className="text-[10px]">Thinking (Hold)</span>
              </>
            ) : faceStatus === 'active' ? (
              <>
                <Camera className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px]">Face Present</span>
              </>
            ) : (
              <>
                <CameraOff className="w-3 h-3 text-neutral-500" />
                <span className="text-[10px]">Face Off</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right: Small subtle progress timer bar */}
      <div className="flex items-center gap-2">
        <div className="w-20 sm:w-28 h-1.5 bg-neutral-800/80 rounded-full overflow-hidden border border-neutral-700/40">
          <div
            className="h-full bg-emerald-500 transition-all duration-100 ease-linear rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
