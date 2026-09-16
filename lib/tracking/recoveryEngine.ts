import { RecoveryState } from '@/types/teleprompter';
import { SemanticMatchResult } from './semanticMatcher';

export interface RecoveryEngineDecision {
  state: RecoveryState;
  shouldAdvance: boolean;
  targetChunkIndex: number | null;
  targetWordIndex: number | null;
  action: 'PROCEED' | 'HOLD' | 'RECOVER_LOCAL';
  reason: string;
}

/**
 * Smart Recovery Engine:
 * Prevents erratic position jumping during speech hesitations, background noise, or low-confidence ASR.
 * Maintains state machine: CONFIDENT -> UNCERTAIN -> RECOVERING -> RECOVERED -> LOST.
 * Strictly limits recovery search to ±1-2 phrases.
 */
export class RecoveryEngine {
  private currentState: RecoveryState = 'CONFIDENT';
  private consecutiveLowConfidenceCount: number = 0;
  private consecutiveHighConfidenceCount: number = 0;
  private recoveryAttempts: number = 0;
  private readonly maxRecoveryAttempts: number = 5;

  public getState(): RecoveryState {
    return this.currentState;
  }

  /**
   * Evaluates live semantic match result against current position and returns recovery decision.
   */
  public evaluate(
    matchResult: SemanticMatchResult,
    currentChunkIndex: number,
    currentWordIndex: number
  ): RecoveryEngineDecision {
    const { bestMatch, confidence, isConfident, direction } = matchResult;

    // 1. High-confidence match (>= 0.72)
    if (bestMatch && isConfident && confidence >= 0.72) {
      this.consecutiveHighConfidenceCount++;
      this.consecutiveLowConfidenceCount = 0;

      // Check distance from current chunk:
      const chunkDelta = bestMatch.chunkIndex - currentChunkIndex;

      // If within local neighborhood (-1 to +2 phrases)
      if (chunkDelta >= -1 && chunkDelta <= 2) {
        if (this.currentState === 'RECOVERING' || this.currentState === 'UNCERTAIN') {
          this.currentState = 'RECOVERED';
        } else {
          this.currentState = 'CONFIDENT';
        }
        this.recoveryAttempts = 0;

        return {
          state: this.currentState,
          shouldAdvance: true,
          targetChunkIndex: bestMatch.chunkIndex,
          targetWordIndex: bestMatch.wordIndex,
          action: 'PROCEED',
          reason: 'CONFIDENT_LOCAL_MATCH',
        };
      }

      // If match is too far away (> 2 chunks ahead or < -1 chunks behind), DO NOT JUMP!
      // Treat as potential false-positive or echo, hold position
      this.currentState = 'UNCERTAIN';
      return {
        state: 'UNCERTAIN',
        shouldAdvance: false,
        targetChunkIndex: currentChunkIndex,
        targetWordIndex: currentWordIndex,
        action: 'HOLD',
        reason: 'FAR_MATCH_BLOCKED',
      };
    }

    // 2. Ambiguous or low-confidence match (0.40 - 0.71)
    if (bestMatch && confidence >= 0.40 && confidence < 0.72) {
      this.consecutiveLowConfidenceCount++;
      this.consecutiveHighConfidenceCount = 0;

      // Check if it's the exact immediate next word or same chunk
      const isNearCurrent =
        bestMatch.chunkIndex === currentChunkIndex &&
        Math.abs(bestMatch.wordIndex - currentWordIndex) <= 2;

      if (isNearCurrent && direction === 'forward') {
        // Subtle progress permitted within the same phrase
        return {
          state: this.currentState,
          shouldAdvance: true,
          targetChunkIndex: currentChunkIndex,
          targetWordIndex: bestMatch.wordIndex,
          action: 'PROCEED',
          reason: 'LOCAL_SUBTLE_PROGRESS',
        };
      }

      // Outside immediate word: enter UNCERTAIN -> HOLD
      this.currentState = 'UNCERTAIN';
      return {
        state: 'UNCERTAIN',
        shouldAdvance: false,
        targetChunkIndex: currentChunkIndex,
        targetWordIndex: currentWordIndex,
        action: 'HOLD',
        reason: 'UNCERTAIN_MATCH_HOLD',
      };
    }

    // 3. Very low or zero match (< 0.40 or null match)
    this.consecutiveLowConfidenceCount++;
    this.consecutiveHighConfidenceCount = 0;

    if (this.consecutiveLowConfidenceCount >= 2 && this.currentState === 'CONFIDENT') {
      this.currentState = 'UNCERTAIN';
    } else if (this.consecutiveLowConfidenceCount >= 4) {
      this.currentState = 'RECOVERING';
      this.recoveryAttempts++;
    }

    if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
      this.currentState = 'LOST';
    }

    // Absolute rule: Silence or low match -> HOLD
    return {
      state: this.currentState,
      shouldAdvance: false,
      targetChunkIndex: currentChunkIndex,
      targetWordIndex: currentWordIndex,
      action: 'HOLD',
      reason: 'LOW_CONFIDENCE_HOLD',
    };
  }

  /**
   * Resets the recovery engine state upon user navigation or teleprompter restart.
   */
  public reset(): void {
    this.currentState = 'CONFIDENT';
    this.consecutiveLowConfidenceCount = 0;
    this.consecutiveHighConfidenceCount = 0;
    this.recoveryAttempts = 0;
  }
}
