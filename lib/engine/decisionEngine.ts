import {
  Chunk,
  TeleprompterMode,
  PlaybackState,
  CognitiveState,
  RecoveryState,
  SpeechRhythmState,
} from '@/types/teleprompter';
import { EngineTickDecision, FaceStatus, VoiceStatus } from '@/types/tracking';
import { transitionCognitiveState } from './cognitiveStateMachine';

export interface DecisionEngineInput {
  mode: TeleprompterMode;
  playbackState: PlaybackState;
  chunks: Chunk[];
  currentChunkIndex: number;
  elapsedSeconds: number; // Time elapsed on the current chunk
  voiceStatus: VoiceStatus;
  voiceMatchedChunkIndex: number | null;
  voiceConfidence: number;
  faceStatus: FaceStatus;
  recoveryState?: RecoveryState;
  speechRhythm?: SpeechRhythmState;
  hasPronunciationFeedback?: boolean;
  isPredicting?: boolean;
}

/**
 * Derives the active human-centered Cognitive State.
 */
export function deriveCognitiveState(input: DecisionEngineInput): CognitiveState {
  const isCompleted =
    input.playbackState === 'completed' ||
    (input.chunks.length > 0 && input.currentChunkIndex >= input.chunks.length - 1 && input.elapsedSeconds >= (input.chunks[input.currentChunkIndex]?.estimatedDuration || 2));

  return transitionCognitiveState('READY', {
    playbackState: input.playbackState,
    currentChunkIndex: input.currentChunkIndex,
    totalChunks: input.chunks.length,
    voiceStatus: input.voiceStatus,
    voiceConfidence: input.voiceConfidence,
    recoveryState: input.recoveryState || 'CONFIDENT',
    hasPronunciationFeedback: Boolean(input.hasPronunciationFeedback),
    isPredicting: Boolean(input.isPredicting),
    faceStatus: input.faceStatus,
    isCompleted,
  });
}

/**
 * Deterministic Decision Engine: Evaluates sensor and timer inputs on each tick.
 * Priority order:
 * 1. Playback state guard (paused / completed / idle => NO-OP)
 * 2. Manual mode guard (manual => NO-OP for automated ticks)
 * 3. Face Presence (if AWAY beyond grace in adaptive mode => HOLD)
 * 4. Voice Match (primary adaptive signal => ADVANCE if confidence >= threshold)
 * 5. Silence / Thinking Rule (silence in voice/adaptive mode => HOLD, do not jump forward)
 * 6. Uncertain Rule (low confidence => HOLD quietly, recover position without jumping)
 * 7. Auto-Pacing Timer fallback (if elapsed >= duration => ADVANCE)
 */
export function evaluateEngineTick(input: DecisionEngineInput): EngineTickDecision {
  const {
    mode,
    playbackState,
    chunks,
    currentChunkIndex,
    elapsedSeconds,
    voiceStatus,
    voiceMatchedChunkIndex,
    voiceConfidence,
    faceStatus,
  } = input;

  // 1. Guard against non-playing states
  if (playbackState !== 'playing') {
    return { action: 'HOLD', reason: 'MANUAL_OVERRIDE' };
  }

  // If already at or beyond the last chunk
  if (currentChunkIndex >= chunks.length - 1) {
    const lastChunk = chunks[chunks.length - 1];
    if (lastChunk && elapsedSeconds >= lastChunk.estimatedDuration) {
      return { action: 'PAUSE', reason: 'COMPLETED' };
    }
    return { action: 'HOLD', reason: 'MANUAL_OVERRIDE' };
  }

  // 2. In purely manual mode, automated ticks never advance
  if (mode === 'manual') {
    return { action: 'HOLD', reason: 'MANUAL_OVERRIDE' };
  }

  // 3. Recovery State Guard: If uncertain or actively recovering, HOLD position
  if (input.recoveryState === 'UNCERTAIN' || input.recoveryState === 'RECOVERING') {
    return { action: 'HOLD', reason: 'RECOVERY_HOLD' };
  }

  // 4. Face tracking signal (Secondary context, evaluated in adaptive mode)
  if (mode === 'adaptive' && faceStatus === 'away') {
    return { action: 'HOLD', reason: 'FACE_AWAY' };
  }

  // 5. Voice tracking evaluation (Primary adaptive signal)
  if (mode === 'voice_follow' || mode === 'adaptive') {
    // Confident match ahead in the local sliding window
    if (
      voiceMatchedChunkIndex !== null &&
      voiceMatchedChunkIndex > currentChunkIndex &&
      voiceConfidence >= 0.70
    ) {
      return {
        action: 'ADVANCE',
        targetChunkIndex: voiceMatchedChunkIndex,
        reason: 'VOICE_MATCH',
      };
    }

    // Uncertain match: hold quietly without jumping
    if (voiceMatchedChunkIndex !== null && voiceConfidence < 0.70) {
      return { action: 'HOLD', reason: 'SILENCE_HOLD' };
    }

    // Explicit Rule: Silence means HOLD!
    if (voiceStatus === 'silence') {
      return { action: 'HOLD', reason: 'SILENCE_HOLD' };
    }

    if (mode === 'voice_follow' && voiceStatus === 'listening') {
      return { action: 'HOLD', reason: 'SILENCE_HOLD' };
    }
  }

  // 6. Auto-Pacing Timer fallback (in smart_pace and adaptive modes)
  if (mode === 'smart_pace' || mode === 'adaptive') {
    const currentChunk = chunks[currentChunkIndex];
    if (!currentChunk) {
      return { action: 'HOLD', reason: 'TIMER_EXPIRED' };
    }

    let requiredDuration = currentChunk.estimatedDuration;

    // Apply speech rhythm adjustment if available
    if (input.speechRhythm && input.speechRhythm.smoothedWPM > 0) {
      const wpmRatio = 140 / Math.max(60, input.speechRhythm.smoothedWPM);
      requiredDuration = requiredDuration * wpmRatio;
    }

    // If face shows "thinking" state, grant a modest grace extension (+1.5s)
    if (mode === 'adaptive' && faceStatus === 'thinking') {
      requiredDuration += 1.5;
    }

    if (elapsedSeconds >= requiredDuration) {
      return {
        action: 'ADVANCE',
        targetChunkIndex: currentChunkIndex + 1,
        reason: 'TIMER_EXPIRED',
      };
    }
  }

  // Default steady state
  return { action: 'HOLD', reason: 'TIMER_EXPIRED' };
}
