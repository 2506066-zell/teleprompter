import { Chunk } from '@/types/teleprompter';
import { SLIDING_WINDOW_LOOKBACK, SLIDING_WINDOW_LOOKAHEAD, MIN_VOICE_CONFIDENCE } from '@/constants/defaults';

/**
 * Normalizes text for speech comparison: lowercase, remove non-alphanumeric, split into tokens.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Calculates token overlap ratio (Dice-Sørensen similarity) between two token lists.
 */
export function calculateTokenSimilarity(spokenTokens: string[], targetTokens: string[]): number {
  if (spokenTokens.length === 0 || targetTokens.length === 0) return 0;

  const targetSet = new Set(targetTokens);
  let matchCount = 0;

  for (const token of spokenTokens) {
    if (targetSet.has(token)) {
      matchCount++;
    }
  }

  return (2 * matchCount) / (spokenTokens.length + targetTokens.length);
}

/**
 * Checks if the end of spoken tokens contains significant overlap with the start of target tokens.
 */
export function calculatePrefixOverlap(spokenTokens: string[], targetTokens: string[]): number {
  if (spokenTokens.length === 0 || targetTokens.length === 0) return 0;

  // Look at the latest 3-5 spoken tokens
  const recentSpoken = spokenTokens.slice(-5);
  // Look at the first 3-5 target tokens
  const targetPrefix = targetTokens.slice(0, 5);

  let matches = 0;
  const targetSet = new Set(targetPrefix);

  for (const token of recentSpoken) {
    if (targetSet.has(token)) {
      matches++;
    }
  }

  return matches / Math.max(1, Math.min(recentSpoken.length, targetPrefix.length));
}

export interface MatchResult {
  matchedIndex: number | null;
  confidence: number;
  candidateScores: { index: number; score: number }[];
}

/**
 * Performs sliding-window fuzzy matching between a live speech transcript and nearby chunks.
 * Window: [currentIndex - SLIDING_WINDOW_LOOKBACK, currentIndex + SLIDING_WINDOW_LOOKAHEAD]
 * Enforces:
 * - Low confidence never triggers a jump
 * - Never jumps outside the local progress window
 */
export function matchTranscriptToChunks(
  transcript: string,
  chunks: Chunk[],
  currentIndex: number,
  confidenceThreshold: number = MIN_VOICE_CONFIDENCE
): MatchResult {
  const spokenTokens = tokenize(transcript);
  if (spokenTokens.length === 0 || chunks.length === 0) {
    return { matchedIndex: null, confidence: 0, candidateScores: [] };
  }

  const start = Math.max(0, currentIndex - SLIDING_WINDOW_LOOKBACK);
  const end = Math.min(chunks.length - 1, currentIndex + SLIDING_WINDOW_LOOKAHEAD);

  const candidateScores: { index: number; score: number }[] = [];
  let bestScore = 0;
  let bestIndex: number | null = null;

  for (let i = start; i <= end; i++) {
    const chunkTokens = tokenize(chunks[i].text);
    const fullSimilarity = calculateTokenSimilarity(spokenTokens, chunkTokens);
    const prefixSimilarity = calculatePrefixOverlap(spokenTokens, chunkTokens);

    // Blended score
    const combinedScore = fullSimilarity * 0.7 + prefixSimilarity * 0.3;
    candidateScores.push({ index: i, score: combinedScore });

    if (combinedScore > bestScore) {
      bestScore = combinedScore;
      bestIndex = i;
    }
  }

  // Only consider it a valid advance if confidence clears the threshold
  if (bestIndex !== null && bestScore >= confidenceThreshold) {
    return {
      matchedIndex: bestIndex,
      confidence: Number(bestScore.toFixed(2)),
      candidateScores,
    };
  }

  return {
    matchedIndex: null,
    confidence: Number(bestScore.toFixed(2)),
    candidateScores,
  };
}
