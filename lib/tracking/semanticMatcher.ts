import { Chunk } from '@/types/teleprompter';
import { isColloquialEquivalent, toIndonesianPhonetic } from './phonetics';

export interface SemanticMatchCandidate {
  chunkIndex: number;
  wordIndex: number;
  confidence: number;
  score: number;
  matchedSpokenToken: string;
  matchedScriptWord: string;
  isExact: boolean;
  isPhonetic: boolean;
  isColloquial: boolean;
}

export interface SemanticMatchResult {
  bestMatch: SemanticMatchCandidate | null;
  predictedNextWordIndex: number | null;
  predictedNextChunkIndex: number | null;
  confidence: number;
  matchingScore: number;
  isConfident: boolean;
  direction: 'forward' | 'hold' | 'rewind';
  localCandidates: { chunkIndex: number; score: number }[];
}

/**
 * Computes normalized Levenshtein similarity between two lowercase strings (0.0 to 1.0).
 */
export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0;

  const lenA = a.length;
  const lenB = b.length;
  const maxLen = Math.max(lenA, lenB);
  if (maxLen === 0) return 1.0;

  // Optimize with single row dynamic programming
  let prevRow: number[] = Array.from({ length: lenB + 1 }, (_, i) => i);
  let currRow: number[] = new Array(lenB + 1);

  for (let i = 1; i <= lenA; i++) {
    currRow[0] = i;
    const charA = a[i - 1];

    for (let j = 1; j <= lenB; j++) {
      const cost = charA === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1, // deletion
        currRow[j - 1] + 1, // insertion
        prevRow[j - 1] + cost // substitution
      );
    }

    [prevRow, currRow] = [currRow, prevRow];
  }

  const distance = prevRow[lenB];
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Cleans and tokenizes text for comparison.
 */
export function cleanToken(word: string): string {
  return word
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
    .trim();
}

/**
 * Scores how well a spoken token matches a script word using multi-tier signals:
 * 1. Exact token match: 1.00
 * 2. Colloquial equivalence (e.g. nggak/tidak, udah/sudah): 0.95
 * 3. Indonesian phonetic equivalence (e.g. aktif/aktip, f/v): 0.90
 * 4. Substring / Levenshtein string similarity >= 0.75: 0.75-0.85
 */
export function scoreWordMatch(
  spoken: string,
  target: string
): { score: number; isExact: boolean; isPhonetic: boolean; isColloquial: boolean } {
  const cleanSpoken = cleanToken(spoken);
  const cleanTarget = cleanToken(target);

  if (!cleanSpoken || !cleanTarget) {
    return { score: 0, isExact: false, isPhonetic: false, isColloquial: false };
  }

  // 1. Exact match
  if (cleanSpoken === cleanTarget) {
    return { score: 1.0, isExact: true, isPhonetic: false, isColloquial: false };
  }

  // 2. Colloquial match (Indonesian informal/formal equivalence)
  if (isColloquialEquivalent(cleanSpoken, cleanTarget)) {
    return { score: 0.95, isExact: false, isPhonetic: false, isColloquial: true };
  }

  // 3. Phonetic match
  const phonSpoken = toIndonesianPhonetic(cleanSpoken);
  const phonTarget = toIndonesianPhonetic(cleanTarget);
  if (phonSpoken && phonTarget && phonSpoken === phonTarget) {
    return { score: 0.90, isExact: false, isPhonetic: true, isColloquial: false };
  }

  // 4. String edit distance similarity
  const sim = stringSimilarity(cleanSpoken, cleanTarget);
  if (sim >= 0.75) {
    return { score: sim * 0.85, isExact: false, isPhonetic: false, isColloquial: false };
  }

  // Substring inclusion for compound or prefixed Indonesian words (ber-, me-, -kan)
  if (
    (cleanTarget.length >= 5 && cleanSpoken.includes(cleanTarget)) ||
    (cleanSpoken.length >= 5 && cleanTarget.includes(cleanSpoken))
  ) {
    return { score: 0.78, isExact: false, isPhonetic: false, isColloquial: false };
  }

  return { score: 0, isExact: false, isPhonetic: false, isColloquial: false };
}

/**
 * Local Script Semantic Matcher:
 * Compares latest live ASR tokens strictly within local window [currentChunk - 1, currentChunk + 2].
 * Accurately finds the speaker's active word, detects natural speech substitutions,
 * and predicts the next anticipated word target.
 */
export function matchTranscriptSemantically(
  transcript: string,
  chunks: Chunk[],
  currentChunkIndex: number,
  currentWordIndex: number = 0
): SemanticMatchResult {
  if (!transcript || chunks.length === 0) {
    return {
      bestMatch: null,
      predictedNextWordIndex: null,
      predictedNextChunkIndex: null,
      confidence: 0,
      matchingScore: 0,
      isConfident: false,
      direction: 'hold',
      localCandidates: [],
    };
  }

  const spokenTokens = transcript
    .split(/\s+/)
    .map(cleanToken)
    .filter(Boolean);

  if (spokenTokens.length === 0) {
    return {
      bestMatch: null,
      predictedNextWordIndex: null,
      predictedNextChunkIndex: null,
      confidence: 0,
      matchingScore: 0,
      isConfident: false,
      direction: 'hold',
      localCandidates: [],
    };
  }

  // Look strictly within local neighborhood: [current - 1, current + 2]
  const startChunk = Math.max(0, currentChunkIndex - 1);
  const endChunk = Math.min(chunks.length - 1, currentChunkIndex + 2);

  const candidateMatches: SemanticMatchCandidate[] = [];
  const localCandidates: { chunkIndex: number; score: number }[] = [];

  // Focus on recent 1-4 spoken tokens
  const recentSpoken = spokenTokens.slice(-4);

  for (let cIdx = startChunk; cIdx <= endChunk; cIdx++) {
    const chunk = chunks[cIdx];
    const chunkWords = chunk.text.split(/\s+/).filter(Boolean);
    let chunkTotalScore = 0;
    let chunkMatchedWords = 0;

    // Locality bias: current chunk is preferred, next chunk is natural progression, prev chunk is review
    const localityMultiplier =
      cIdx === currentChunkIndex
        ? 1.05
        : cIdx === currentChunkIndex + 1
        ? 1.0
        : 0.9;

    for (let wIdx = 0; wIdx < chunkWords.length; wIdx++) {
      const scriptWord = chunkWords[wIdx];

      for (let sIdx = 0; sIdx < recentSpoken.length; sIdx++) {
        const spoken = recentSpoken[sIdx];
        const { score, isExact, isPhonetic, isColloquial } = scoreWordMatch(spoken, scriptWord);

        if (score > 0.65) {
          const recencyWeight = (sIdx + 1) / recentSpoken.length; // later spoken words weighted higher
          const weightedScore = score * localityMultiplier * (0.8 + 0.2 * recencyWeight);

          chunkTotalScore += weightedScore;
          chunkMatchedWords++;

          candidateMatches.push({
            chunkIndex: cIdx,
            wordIndex: wIdx,
            confidence: score,
            score: weightedScore,
            matchedSpokenToken: spoken,
            matchedScriptWord: scriptWord,
            isExact,
            isPhonetic,
            isColloquial,
          });
        }
      }
    }

    const avgChunkScore =
      chunkWords.length > 0 ? (chunkTotalScore / Math.max(1, chunkMatchedWords)) : 0;
    localCandidates.push({ chunkIndex: cIdx, score: avgChunkScore });
  }

  if (candidateMatches.length === 0) {
    return {
      bestMatch: null,
      predictedNextWordIndex: null,
      predictedNextChunkIndex: null,
      confidence: 0,
      matchingScore: 0,
      isConfident: false,
      direction: 'hold',
      localCandidates,
    };
  }

  // Sort candidates by score descending
  candidateMatches.sort((a, b) => b.score - a.score);
  const bestMatch = candidateMatches[0];

  // Determine direction relative to current position
  let direction: 'forward' | 'hold' | 'rewind' = 'hold';
  if (
    bestMatch.chunkIndex > currentChunkIndex ||
    (bestMatch.chunkIndex === currentChunkIndex && bestMatch.wordIndex > currentWordIndex)
  ) {
    direction = 'forward';
  } else if (
    bestMatch.chunkIndex < currentChunkIndex ||
    (bestMatch.chunkIndex === currentChunkIndex && bestMatch.wordIndex < currentWordIndex - 2)
  ) {
    direction = 'rewind';
  }

  // Predict next word & next chunk
  let predictedNextChunkIndex: number | null = bestMatch.chunkIndex;
  let predictedNextWordIndex: number | null = bestMatch.wordIndex + 1;

  const currentChunkWords = chunks[bestMatch.chunkIndex]?.text.split(/\s+/).filter(Boolean) || [];
  if (predictedNextWordIndex >= currentChunkWords.length) {
    // Next word transitions to the start of the next chunk
    if (bestMatch.chunkIndex + 1 < chunks.length) {
      predictedNextChunkIndex = bestMatch.chunkIndex + 1;
      predictedNextWordIndex = 0;
    } else {
      predictedNextChunkIndex = null;
      predictedNextWordIndex = null;
    }
  }

  const isConfident = bestMatch.confidence >= 0.70;

  return {
    bestMatch,
    predictedNextWordIndex,
    predictedNextChunkIndex,
    confidence: bestMatch.confidence,
    matchingScore: bestMatch.score,
    isConfident,
    direction,
    localCandidates,
  };
}
