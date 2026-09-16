import { CognitiveState, PlaybackState, RecoveryState } from '@/types/teleprompter';
import { VoiceStatus, FaceStatus } from '@/types/tracking';

export interface StateMachineInput {
  playbackState: PlaybackState;
  currentChunkIndex: number;
  totalChunks: number;
  voiceStatus: VoiceStatus;
  voiceConfidence: number;
  recoveryState: RecoveryState;
  hasPronunciationFeedback: boolean;
  isPredicting: boolean;
  faceStatus: FaceStatus;
  isCompleted: boolean;
}

/**
 * 10-State Cognitive State Machine:
 * Manages human-centered states:
 * READY -> LISTENING -> FOLLOWING <-> PREDICTING -> THINKING -> UNCERTAIN -> RECOVERING -> CORRECTING -> PAUSED -> FINISHED
 */
export function transitionCognitiveState(
  prevState: CognitiveState,
  input: StateMachineInput
): CognitiveState {
  const {
    playbackState,
    currentChunkIndex,
    totalChunks,
    voiceStatus,
    voiceConfidence,
    recoveryState,
    hasPronunciationFeedback,
    isPredicting,
    faceStatus,
    isCompleted,
  } = input;

  // 1. Completion guard
  if (isCompleted || playbackState === 'completed' || (totalChunks > 0 && currentChunkIndex >= totalChunks - 1 && isCompleted)) {
    return 'FINISHED';
  }

  // 2. Idle guard
  if (playbackState === 'idle') {
    return 'READY';
  }

  // 3. Paused guard (manual pause or face away)
  if (playbackState === 'paused' || faceStatus === 'away') {
    return 'PAUSED';
  }

  // 4. Pronunciation correction state (micro-interruption card)
  if (hasPronunciationFeedback) {
    return 'CORRECTING';
  }

  // 5. Recovery states
  if (recoveryState === 'RECOVERING' || recoveryState === 'LOST') {
    return 'RECOVERING';
  }

  if (recoveryState === 'UNCERTAIN' || (voiceConfidence > 0 && voiceConfidence < 0.65)) {
    return 'UNCERTAIN';
  }

  // 6. Silence / Thinking state
  if (voiceStatus === 'silence' || voiceStatus === 'off') {
    return 'THINKING';
  }

  // 7. Speaking & Tracking states
  if (voiceStatus === 'speaking') {
    if (isPredicting && voiceConfidence >= 0.70) {
      return 'PREDICTING';
    }
    if (voiceConfidence >= 0.70) {
      return 'FOLLOWING';
    }
    return 'FOLLOWING';
  }

  if (voiceStatus === 'listening') {
    return 'LISTENING';
  }

  return 'READY';
}

/**
 * Returns human-friendly label and color token for cognitive state pill in UI.
 */
export function getCognitiveStateDisplay(state: CognitiveState): { label: string; colorClass: string; pulse: boolean } {
  const normalized = state.toUpperCase();

  switch (normalized) {
    case 'FOLLOWING':
      return { label: 'FOLLOWING', colorClass: 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40', pulse: true };
    case 'PREDICTING':
      return { label: 'PREDICTING', colorClass: 'text-cyan-400 bg-cyan-950/80 border-cyan-500/40', pulse: true };
    case 'THINKING':
      return { label: 'THINKING', colorClass: 'text-amber-300 bg-amber-950/80 border-amber-500/40', pulse: false };
    case 'UNCERTAIN':
      return { label: 'UNCERTAIN', colorClass: 'text-yellow-400 bg-yellow-950/80 border-yellow-500/40', pulse: false };
    case 'RECOVERING':
      return { label: 'RECOVERING', colorClass: 'text-sky-400 bg-sky-950/80 border-sky-500/40', pulse: true };
    case 'CORRECTING':
      return { label: 'CORRECTION', colorClass: 'text-rose-400 bg-rose-950/80 border-rose-500/40', pulse: true };
    case 'LISTENING':
      return { label: 'LISTENING', colorClass: 'text-emerald-400/80 bg-emerald-950/60 border-emerald-500/30', pulse: false };
    case 'PAUSED':
      return { label: 'PAUSED', colorClass: 'text-neutral-400 bg-neutral-900 border-neutral-700', pulse: false };
    case 'FINISHED':
      return { label: 'COMPLETED', colorClass: 'text-emerald-300 bg-emerald-950 border-emerald-500', pulse: false };
    case 'READY':
    default:
      return { label: 'READY', colorClass: 'text-neutral-300 bg-neutral-900 border-neutral-800', pulse: false };
  }
}
