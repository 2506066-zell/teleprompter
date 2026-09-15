import { PAUSE_DURATIONS } from '@/constants/breakpoints';

export interface ChunkDurationInput {
  wordCount: number;
  complexityScore?: number;
  emphasisLevel?: number;
  text?: string;
  wpm?: number;
  speedMultiplier?: number;
}

/**
 * Calculates deterministic duration in seconds for a reading chunk.
 * Formula:
 * Duration = BaseTime + PunctuationPause + ComplexityPause + EmphasisPause
 * SpeedMultiplier scales the final output.
 */
export function calculateChunkDuration({
  wordCount,
  complexityScore = 1.0,
  emphasisLevel = 1.0,
  text = '',
  wpm = 140,
  speedMultiplier = 1.0,
}: ChunkDurationInput): number {
  const safeWpm = Math.max(60, Math.min(260, wpm));
  const safeMultiplier = Math.max(0.5, Math.min(2.0, speedMultiplier));

  // 1. Base reading time in seconds
  const wordsPerSecond = safeWpm / 60;
  const baseDuration = wordCount / wordsPerSecond;

  // 2. Punctuation pauses
  let punctuationPause = 0;
  const trimmed = text.trim();

  if (/[.!?]$/.test(trimmed)) {
    punctuationPause += PAUSE_DURATIONS.sentenceEnd;
  } else if (/[,;:–—]$/.test(trimmed)) {
    punctuationPause += PAUSE_DURATIONS.clauseBreak;
  }

  // Count internal commas or pauses
  const internalPunctuation = (trimmed.slice(0, -1).match(/[,;:]/g) || []).length;
  punctuationPause += internalPunctuation * 0.15;

  // 3. Complexity pause
  // Scores typically 1.00 to 1.50
  const complexityPause = Math.max(0, (complexityScore - 1.0) * 0.7);

  // 4. Emphasis pause
  const emphasisPause = Math.max(0, (emphasisLevel - 1.0) * 0.4);

  // Raw duration
  const totalRawDuration = baseDuration + punctuationPause + complexityPause + emphasisPause;

  // Minimum floor: every chunk should display for at least 1.2s to prevent flash-reading
  const floored = Math.max(1.2, totalRawDuration);

  // Apply manual user speed multiplier (e.g. 1.5x speed divides the duration)
  const adjustedDuration = floored / safeMultiplier;

  return Number(adjustedDuration.toFixed(2));
}

/**
 * Formats seconds into a human-friendly duration label (e.g. "2.4s").
 */
export function formatChunkSeconds(seconds: number): string {
  return `${seconds.toFixed(1)}s`;
}
