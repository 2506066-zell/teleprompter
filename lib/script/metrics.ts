import { TeleprompterMetrics } from '@/types/teleprompter';

/**
 * Calculates raw word count from text.
 */
export function countWords(text: string): number {
  if (!text || text.trim() === '') return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Calculates character count excluding excessive whitespace.
 */
export function countCharacters(text: string): number {
  if (!text) return 0;
  return text.length;
}

/**
 * Calculates a normalized linguistic complexity score (typically 1.00 to 1.50).
 * Influenced by:
 * - Average word length
 * - Presence of long/complex words (> 8 characters)
 * - Punctuation density
 */
export function calculateComplexityScore(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 1.0;

  let totalCharsInWords = 0;
  let complexWordCount = 0;

  for (const word of words) {
    const cleanWord = word.replace(/[^\w]/g, '');
    totalCharsInWords += cleanWord.length;
    if (cleanWord.length >= 8) {
      complexWordCount += 1;
    }
  }

  const avgWordLength = totalCharsInWords / words.length;
  const complexWordRatio = complexWordCount / words.length;

  // Count punctuation marks
  const punctuationMatches = text.match(/[,;:\-\–\—\.\?!]/g);
  const punctuationCount = punctuationMatches ? punctuationMatches.length : 0;
  const punctuationDensity = punctuationCount / words.length;

  // Base score 1.0, modest multipliers:
  // Avg word length 5 is standard. > 6 is more complex.
  const lengthFactor = Math.max(0, (avgWordLength - 5) * 0.04);
  const complexWordFactor = complexWordRatio * 0.15;
  const punctFactor = Math.min(0.15, punctuationDensity * 0.05);

  const rawScore = 1.0 + lengthFactor + complexWordFactor + punctFactor;
  // Clamp between 1.00 and 1.50 so it never creates wild pacing jumps
  return Number(Math.min(1.5, Math.max(1.0, rawScore)).toFixed(2));
}

/**
 * Formats seconds into MM:SS format.
 */
export function formatDuration(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds));
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Returns summary metrics for a given raw text script.
 */
export function getScriptMetrics(text: string, wpm: number = 140): TeleprompterMetrics {
  const totalWords = countWords(text);
  const totalCharacters = countCharacters(text);
  const baseMinutes = totalWords / Math.max(60, wpm);
  const estimatedTotalSeconds = Math.round(baseMinutes * 60);

  return {
    totalWords,
    totalCharacters,
    estimatedTotalSeconds,
    formattedDuration: formatDuration(estimatedTotalSeconds),
  };
}
