import { Chunk, TeleprompterMode } from '@/types/teleprompter';
import { SpeechRhythmState } from '@/types/teleprompter';

export interface AdaptivePacingInput {
  mode: TeleprompterMode;
  currentChunk: Chunk;
  nextChunk?: Chunk;
  rhythm: SpeechRhythmState;
  elapsedOnChunk: number;
  isSpeaking: boolean;
  trackingConfidence: number;
  faceAttention?: 'ACTIVE' | 'THINKING' | 'AWAY';
  distancePixels: number; // Distance from currentOffset to targetOffset in DOM
}

export interface AdaptivePacingOutput {
  action: 'PROCEED' | 'HOLD' | 'ANTICIPATE';
  movementDurationMs: number; // 180ms - 450ms
  smoothingLambda: number; // rAF exponential rate
  pauseType: 'none' | 'punctuation' | 'thinking' | 'hesitation' | 'stop' | 'uncertainty';
  anticipationOffsetPx: number;
  effectiveWPM: number;
}

/**
 * Adaptive Pacing Engine:
 * Estimates when and how the reading viewport should move according to human speech rhythms.
 * Calculates distance-aware transit duration (180ms - 450ms) and detects pause types.
 * NEVER modifies text geometry.
 */
export class AdaptivePacingEngine {
  /**
   * Calculates distance-aware continuous movement duration:
   * Small movement (e.g. 40px): fast & crisp (~200ms)
   * Medium movement (e.g. 120px): normal (~280ms)
   * Large movement (e.g. > 250px): stately & smooth (~420ms)
   * Formula: clamp(baseDuration + distanceFactor, 180ms, 450ms)
   */
  public static calculateMovementDuration(distancePixels: number): number {
    const absDistance = Math.abs(distancePixels);
    const baseDuration = 190;
    const distanceFactor = Math.min(240, absDistance * 0.9);
    const duration = baseDuration + distanceFactor;
    return Math.max(180, Math.min(450, Math.round(duration)));
  }

  /**
   * Converts movement duration into exponential rAF lambda rate:
   * lambda ~ 3000 / durationMs
   * For 200ms -> lambda ~ 15
   * For 300ms -> lambda ~ 10
   * For 450ms -> lambda ~ 6.6
   */
  public static calculateSmoothingLambda(durationMs: number): number {
    const safeDuration = Math.max(180, Math.min(450, durationMs));
    return Number((2800 / safeDuration).toFixed(2));
  }

  /**
   * Evaluates pacing decision based on rhythm, pause behavior, and tracking signals.
   */
  public static evaluate(input: AdaptivePacingInput): AdaptivePacingOutput {
    const {
      mode,
      currentChunk,
      rhythm,
      elapsedOnChunk,
      isSpeaking,
      trackingConfidence,
      faceAttention,
      distancePixels,
    } = input;

    const movementDurationMs = this.calculateMovementDuration(distancePixels);
    const smoothingLambda = this.calculateSmoothingLambda(movementDurationMs);

    // 1. Detect Human Pause Type
    let pauseType: AdaptivePacingOutput['pauseType'] = 'none';

    if (!isSpeaking) {
      if (faceAttention === 'THINKING' || (faceAttention === 'ACTIVE' && rhythm.pauseProbability > 0.6)) {
        pauseType = 'thinking';
      } else if (/[.!?]$/.test(currentChunk.text.trim())) {
        pauseType = 'punctuation';
      } else if (trackingConfidence > 0 && trackingConfidence < 0.60) {
        pauseType = 'uncertainty';
      } else if (rhythm.pauseProbability > 0.8) {
        pauseType = 'stop';
      } else {
        pauseType = 'hesitation';
      }
    }

    // 2. In Voice Follow or Adaptive mode with Voice:
    // Core Mandate: Silence means HOLD!
    if ((mode === 'voice_follow' || mode === 'adaptive') && !isSpeaking) {
      return {
        action: 'HOLD',
        movementDurationMs,
        smoothingLambda,
        pauseType,
        anticipationOffsetPx: 0,
        effectiveWPM: rhythm.smoothedWPM,
      };
    }

    // 3. Anticipation calculation when speaker is fluidly reading
    // If speaking fast (> 160 WPM) with acceleration, provide subtle anticipation offset
    let anticipationOffsetPx = 0;
    if (isSpeaking && rhythm.smoothedWPM > 160 && rhythm.speechAcceleration > 0) {
      anticipationOffsetPx = Math.min(16, Math.round(rhythm.speechAcceleration * 8));
    }

    // 4. In smart_pace or fallback mode:
    // Pacing derives from estimated duration adjusted by smoothed WPM
    const wpmRatio = 140 / Math.max(60, rhythm.smoothedWPM);
    const adjustedChunkDuration = currentChunk.estimatedDuration * wpmRatio;

    if (elapsedOnChunk >= adjustedChunkDuration) {
      return {
        action: 'PROCEED',
        movementDurationMs,
        smoothingLambda,
        pauseType: 'none',
        anticipationOffsetPx,
        effectiveWPM: rhythm.smoothedWPM,
      };
    }

    return {
      action: 'HOLD',
      movementDurationMs,
      smoothingLambda,
      pauseType,
      anticipationOffsetPx,
      effectiveWPM: rhythm.smoothedWPM,
    };
  }
}
