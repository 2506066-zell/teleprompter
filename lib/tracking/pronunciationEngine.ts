/**
 * Pronunciation-Aware Voice Tracking Engine
 * Evaluates speech understandability, phonetic accuracy, and context awareness.
 *
 * TRACK -> UNDERSTAND -> VALIDATE -> CORRECT -> CONTINUE
 */

import { PronunciationStrictness, PronunciationFeedback } from '@/types/teleprompter';
import { calculatePhoneticSimilarity, isColloquialEquivalent } from './phonetics';

export interface PronunciationEvaluationInput {
  targetWord: string;
  detectedTranscript: string;
  surroundingWords?: string[];
  speechConfidence?: number; // 0.0 - 1.0 from SpeechRecognitionAlternative.confidence
  strictness: PronunciationStrictness;
  isImportantTerm?: boolean;
  currentAttempt?: number;
}

export interface PronunciationEvaluationResult {
  status: 'correct' | 'unclear' | 'mispronounced';
  targetWord: string;
  detectedWord: string;
  similarity: number;
  confidence: number;
  feedbackMessage: string;
  allowSkip: boolean;
  attemptCount: number;
}

// Strictness thresholds for passing as 'correct'
const STRICTNESS_THRESHOLDS: Record<PronunciationStrictness, number> = {
  natural: 0.70,   // High tolerance, ideal for storytelling, casual creators
  balanced: 0.82,  // Balanced tolerance (default), suitable for presentations & public speaking
  precise: 0.92,   // Low tolerance, for technical jargon, foreign terms, product names
};

/**
 * Extracts the most relevant token in the spoken transcript matching the target word.
 */
function findBestSpokenCandidate(target: string, transcript: string): { candidate: string; score: number } {
  const spokenTokens = transcript
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (spokenTokens.length === 0) {
    return { candidate: '', score: 0 };
  }

  let bestToken = spokenTokens[spokenTokens.length - 1]; // Default to latest spoken
  let bestScore = 0;

  for (const token of spokenTokens) {
    const score = calculatePhoneticSimilarity(token, target);
    if (score > bestScore) {
      bestScore = score;
      bestToken = token;
    }
  }

  return { candidate: bestToken, score: bestScore };
}

/**
 * Calculates surrounding context score.
 * If surrounding words in the target phrase were also uttered, the whole sentence is coherent,
 * so individual word low confidence should not trigger a false error.
 */
function calculateContextScore(surroundingWords: string[], transcript: string): number {
  if (!surroundingWords || surroundingWords.length === 0) return 1.0;

  const lowerTranscript = transcript.toLowerCase();
  let matched = 0;

  for (const word of surroundingWords) {
    const clean = word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '').trim();
    if (clean && lowerTranscript.includes(clean)) {
      matched++;
    }
  }

  return matched / surroundingWords.length;
}

/**
 * Core Evaluation Function:
 * Decides between CORRECT, UNCLEAR, and MISPRONOUNCED based on multi-signal evidence.
 */
export function evaluatePronunciation({
  targetWord,
  detectedTranscript,
  surroundingWords = [],
  speechConfidence = 0.85,
  strictness = 'balanced',
  isImportantTerm = false,
  currentAttempt = 0,
}: PronunciationEvaluationInput): PronunciationEvaluationResult {
  const cleanTarget = targetWord.replace(/[^\p{L}\p{N}]/gu, '').trim();

  // If no target word or transcript is empty, pass as neutral correct
  if (!cleanTarget || !detectedTranscript.trim()) {
    return {
      status: 'correct',
      targetWord: cleanTarget,
      detectedWord: '',
      similarity: 1.0,
      confidence: 1.0,
      feedbackMessage: '',
      allowSkip: false,
      attemptCount: currentAttempt,
    };
  }

  // 1. Find the best spoken candidate
  const { candidate: detectedWord, score: phoneticSimilarity } = findBestSpokenCandidate(
    cleanTarget,
    detectedTranscript
  );

  // 2. Surrounding context score
  const contextScore = calculateContextScore(surroundingWords, detectedTranscript);

  // 3. Effective threshold calculation:
  // If term was marked with [bracket], automatically elevate to precise strictness
  const effectiveStrictness = isImportantTerm ? 'precise' : strictness;
  const threshold = STRICTNESS_THRESHOLDS[effectiveStrictness];

  // 4. Combined multi-signal confidence:
  // Weighted: 55% phonetic similarity, 25% speech recognition acoustic confidence, 20% context match
  const multiSignalConfidence = Number(
    (phoneticSimilarity * 0.55 + speechConfidence * 0.25 + contextScore * 0.20).toFixed(3)
  );

  // Increment attempt counter
  const attemptCount = currentAttempt + 1;
  const allowSkip = attemptCount >= 2;

  // Decision 1: Colloquial equivalence or phonetic similarity passes threshold
  if (isColloquialEquivalent(detectedWord, cleanTarget) || phoneticSimilarity >= threshold) {
    return {
      status: 'correct',
      targetWord: cleanTarget,
      detectedWord,
      similarity: phoneticSimilarity,
      confidence: multiSignalConfidence,
      feedbackMessage: '✓',
      allowSkip: false,
      attemptCount: 0, // Reset attempt on success
    };
  }

  // Decision 2: UNCLEAR vs MISPRONOUNCED distinction
  // "I don't understand the speech" (low acoustic recognition confidence / ambient noise)
  // vs "Your pronunciation is wrong" (high acoustic confidence but phonetically distinct word)
  if (speechConfidence < 0.62 || phoneticSimilarity >= 0.50 && phoneticSimilarity < threshold) {
    return {
      status: 'unclear',
      targetWord: cleanTarget,
      detectedWord,
      similarity: phoneticSimilarity,
      confidence: multiSignalConfidence,
      feedbackMessage: 'Kurang jelas — coba ulangi',
      allowSkip,
      attemptCount,
    };
  }

  // Decision 3: MISPRONOUNCED (confidence is high that user said a different word from target)
  return {
    status: 'mispronounced',
    targetWord: cleanTarget,
    detectedWord,
    similarity: phoneticSimilarity,
    confidence: multiSignalConfidence,
    feedbackMessage: `Coba ulangi: ${cleanTarget}`,
    allowSkip,
    attemptCount,
  };
}
