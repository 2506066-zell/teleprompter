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
 * Finds the index of the word within the chunk that matches the latest spoken token.
 */
export function findActiveWordInChunk(spokenTokens: string[], chunkWords: string[]): number {
  if (spokenTokens.length === 0 || chunkWords.length === 0) return 0;

  // Look at the latest 1-3 spoken tokens
  const latestSpoken = spokenTokens.slice(-3);

  // Scan chunk words from right to left to find the latest uttered word
  for (let i = chunkWords.length - 1; i >= 0; i--) {
    const cleanChunkWord = chunkWords[i].toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    for (const spoken of latestSpoken) {
      if (cleanChunkWord === spoken || (cleanChunkWord.length > 3 && spoken.includes(cleanChunkWord))) {
        return i;
      }
    }
  }

  return 0;
}

export interface MatchResult {
  matchedIndex: number | null;
  matchedWordIndex: number;
  confidence: number;
  isConfident: boolean;
  candidateScores: { index: number; score: number }[];
}

/**
 * Anti-Jump Sliding-Window Fuzzy Matching:
 * Compares live transcript strictly within local window [currentIndex - lookback, currentIndex + lookahead].
 * Returns both the matched chunk index and the active word index within that chunk.
 */
export function matchTranscriptToChunks(
  transcript: string,
  chunks: Chunk[],
  currentIndex: number,
  confidenceThreshold: number = MIN_VOICE_CONFIDENCE
): MatchResult {
  const spokenTokens = tokenize(transcript);
  if (spokenTokens.length === 0 || chunks.length === 0) {
    return { matchedIndex: null, matchedWordIndex: 0, confidence: 0, isConfident: false, candidateScores: [] };
  }

  // Anti-Jump Constraint: Strictly local search
  const start = Math.max(0, currentIndex - SLIDING_WINDOW_LOOKBACK);
  const end = Math.min(chunks.length - 1, currentIndex + SLIDING_WINDOW_LOOKAHEAD);

  const candidateScores: { index: number; score: number }[] = [];
  let bestScore = 0;
  let bestIndex: number | null = null;

  for (let i = start; i <= end; i++) {
    const chunkTokens = tokenize(chunks[i].text);
    const fullSimilarity = calculateTokenSimilarity(spokenTokens, chunkTokens);

    // Give slight bias to current chunk and immediate next chunk
    const localityWeight = i === currentIndex ? 1.05 : i === currentIndex + 1 ? 1.0 : 0.9;
    const weightedScore = fullSimilarity * localityWeight;

    candidateScores.push({ index: i, score: weightedScore });

    if (weightedScore > bestScore) {
      bestScore = weightedScore;
      bestIndex = i;
    }
  }

  const isConfident = bestIndex !== null && bestScore >= confidenceThreshold;

  if (isConfident && bestIndex !== null) {
    const matchedChunkWords = chunks[bestIndex].text.split(/\s+/).filter(Boolean);
    const activeWordIdx = findActiveWordInChunk(spokenTokens, matchedChunkWords);

    return {
      matchedIndex: bestIndex,
      matchedWordIndex: activeWordIdx,
      confidence: Number(bestScore.toFixed(2)),
      isConfident: true,
      candidateScores,
    };
  }

  // If match confidence is ambiguous, determine word progress on current chunk if applicable
  const currentChunkWords = chunks[currentIndex]?.text.split(/\s+/).filter(Boolean) || [];
  const currentWordIdx = findActiveWordInChunk(spokenTokens, currentChunkWords);

  return {
    matchedIndex: null,
    matchedWordIndex: currentWordIdx,
    confidence: Number(bestScore.toFixed(2)),
    isConfident: false,
    candidateScores,
  };
}
