import { Chunk } from '@/types/teleprompter';
import { CHUNK_WORD_LIMITS, INDONESIAN_CONJUNCTIONS, ENGLISH_CONJUNCTIONS } from '@/constants/breakpoints';
import { countWords, calculateComplexityScore } from './metrics';
import { calculateChunkDuration } from '../pacing/pacingCalculator';
import { extractImportantWords } from '../tracking/phonetics';

/**
 * Normalizes script text: clean up extra spaces and normalize line breaks.
 */
export function normalizeText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Splits text into paragraphs by blank lines.
 */
export function parseParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Splits a paragraph into complete sentences.
 * Avoids breaking on common abbreviations like dr., prof., dll., etc.
 */
export function parseSentences(paragraph: string): string[] {
  // Protect common Indonesian/English abbreviations
  const protectedText = paragraph
    .replace(/\b(dr|prof|ir|drs|apt|h|hj|mr|mrs|ms|st)\./gi, '$1__DOT__')
    .replace(/\b(dll|dsb|dst|ttd|etc|i\.e|e\.g)\./gi, '$1__DOT__')
    .replace(/(\d+)\.(\d+)/g, '$1__DECIMAL__$2');

  // Split on strong punctuation
  const rawSentences = protectedText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [paragraph];

  return rawSentences
    .map((s) =>
      s
        .replace(/__DOT__/g, '.')
        .replace(/__DECIMAL__/g, '.')
        .trim()
    )
    .filter(Boolean);
}

/**
 * Splits a sentence that exceeds target limits into natural reading units.
 */
function splitLongSentence(
  sentence: string,
  limits: { idealMin: number; idealMax: number; hardMax: number }
): string[] {
  const totalWords = countWords(sentence);
  if (totalWords <= limits.idealMax) {
    return [sentence];
  }

  // 1. Try splitting by soft punctuation (, ; : —)
  const softSegments = sentence
    .split(/([,;:–—]+)/)
    .filter(Boolean);

  if (softSegments.length > 1) {
    const combined: string[] = [];
    let current = '';

    for (let i = 0; i < softSegments.length; i++) {
      const part = softSegments[i];
      if (/^[,;:–—]+$/.test(part)) {
        current += part;
      } else {
        if (current && countWords(current + ' ' + part) > limits.hardMax) {
          combined.push(current.trim());
          current = part.trim();
        } else {
          current = current ? `${current} ${part.trim()}` : part.trim();
        }
      }
    }
    if (current.trim()) {
      combined.push(current.trim());
    }

    // Check if each segment now satisfies hardMax
    const needsFurtherSplit = combined.some((seg) => countWords(seg) > limits.hardMax);
    if (!needsFurtherSplit) {
      return combined;
    }
  }

  // 2. Try splitting before natural Indonesian / English conjunctions
  const allConjunctions = [...INDONESIAN_CONJUNCTIONS, ...ENGLISH_CONJUNCTIONS];
  const words = sentence.split(/\s+/).filter(Boolean);
  const resultChunks: string[] = [];
  let currentWords: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isConjunction = allConjunctions.includes(cleanWord);

    // If we have at least idealMin words and encounter a conjunction or hit hardMax
    if (
      (isConjunction && currentWords.length >= limits.idealMin) ||
      currentWords.length >= limits.hardMax
    ) {
      resultChunks.push(currentWords.join(' '));
      currentWords = [word];
    } else {
      currentWords.push(word);
    }
  }

  if (currentWords.length > 0) {
    // If the trailing chunk is too small (< idealMin) and can be merged into previous, merge it
    if (
      resultChunks.length > 0 &&
      currentWords.length < 3 &&
      countWords(resultChunks[resultChunks.length - 1]) + currentWords.length <= limits.hardMax
    ) {
      resultChunks[resultChunks.length - 1] += ' ' + currentWords.join(' ');
    } else {
      resultChunks.push(currentWords.join(' '));
    }
  }

  return resultChunks.length > 0 ? resultChunks : [sentence];
}

/**
 * Smart Chunking Pipeline:
 * Raw Script -> Normalize -> Paragraphs -> Sentences -> Natural Breakpoints -> Reading Chunks
 */
export function createReadingChunks(
  rawScript: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
  wpm: number = 140
): Chunk[] {
  const normalized = normalizeText(rawScript);
  if (!normalized) return [];

  const limits = CHUNK_WORD_LIMITS[orientation];
  const paragraphs = parseParagraphs(normalized);
  const chunks: Chunk[] = [];
  let orderIndex = 0;

  for (const para of paragraphs) {
    const sentences = parseSentences(para);

    for (const sentence of sentences) {
      const sentenceChunks = splitLongSentence(sentence, limits);

      for (const chunkText of sentenceChunks) {
        const text = chunkText.trim();
        if (!text) continue;

        const { cleanText, importantWords } = extractImportantWords(text);
        const wordCount = countWords(cleanText);
        const complexityScore = calculateComplexityScore(cleanText);
        const emphasisLevel = 1.0;
        const estimatedDuration = calculateChunkDuration({
          wordCount,
          complexityScore,
          emphasisLevel,
          text: cleanText,
          wpm,
        });

        chunks.push({
          id: `chunk-${orderIndex}-${Date.now().toString(36)}`,
          order: orderIndex,
          text: cleanText,
          wordCount,
          complexityScore,
          emphasisLevel,
          estimatedDuration,
          importantWords: importantWords.length > 0 ? importantWords : undefined,
        });

        orderIndex++;
      }
    }
  }

  return chunks;
}

/**
 * Allows user to manually split an existing chunk into two.
 */
export function splitChunk(
  chunks: Chunk[],
  chunkIndex: number,
  splitWordIndex: number,
  wpm: number = 140
): Chunk[] {
  if (chunkIndex < 0 || chunkIndex >= chunks.length) return chunks;

  const target = chunks[chunkIndex];
  const words = target.text.split(/\s+/).filter(Boolean);

  if (splitWordIndex <= 0 || splitWordIndex >= words.length) return chunks;

  const firstText = words.slice(0, splitWordIndex).join(' ');
  const secondText = words.slice(splitWordIndex).join(' ');

  const firstChunk: Chunk = {
    ...target,
    id: `chunk-${chunkIndex}-a-${Date.now().toString(36)}`,
    text: firstText,
    wordCount: countWords(firstText),
    complexityScore: calculateComplexityScore(firstText),
    estimatedDuration: calculateChunkDuration({
      wordCount: countWords(firstText),
      complexityScore: calculateComplexityScore(firstText),
      emphasisLevel: target.emphasisLevel,
      text: firstText,
      wpm,
    }),
  };

  const secondChunk: Chunk = {
    ...target,
    id: `chunk-${chunkIndex}-b-${Date.now().toString(36)}`,
    text: secondText,
    wordCount: countWords(secondText),
    complexityScore: calculateComplexityScore(secondText),
    estimatedDuration: calculateChunkDuration({
      wordCount: countWords(secondText),
      complexityScore: calculateComplexityScore(secondText),
      emphasisLevel: target.emphasisLevel,
      text: secondText,
      wpm,
    }),
  };

  const updated = [...chunks];
  updated.splice(chunkIndex, 1, firstChunk, secondChunk);

  // Re-index orders
  return updated.map((c, i) => ({ ...c, order: i }));
}

/**
 * Allows user to merge a chunk with the next chunk.
 */
export function mergeChunks(chunks: Chunk[], chunkIndex: number, wpm: number = 140): Chunk[] {
  if (chunkIndex < 0 || chunkIndex >= chunks.length - 1) return chunks;

  const first = chunks[chunkIndex];
  const second = chunks[chunkIndex + 1];
  const mergedText = `${first.text} ${second.text}`.trim();

  const mergedChunk: Chunk = {
    ...first,
    id: `chunk-${chunkIndex}-merged-${Date.now().toString(36)}`,
    text: mergedText,
    wordCount: countWords(mergedText),
    complexityScore: calculateComplexityScore(mergedText),
    estimatedDuration: calculateChunkDuration({
      wordCount: countWords(mergedText),
      complexityScore: calculateComplexityScore(mergedText),
      emphasisLevel: Math.max(first.emphasisLevel, second.emphasisLevel),
      text: mergedText,
      wpm,
    }),
  };

  const updated = [...chunks];
  updated.splice(chunkIndex, 2, mergedChunk);

  return updated.map((c, i) => ({ ...c, order: i }));
}

/**
 * Updates text of a specific chunk and recalculates its duration and complexity.
 */
export function updateChunkText(
  chunks: Chunk[],
  chunkIndex: number,
  newText: string,
  wpm: number = 140
): Chunk[] {
  if (chunkIndex < 0 || chunkIndex >= chunks.length) return chunks;

  const target = chunks[chunkIndex];
  const wordCount = countWords(newText);
  const complexityScore = calculateComplexityScore(newText);
  const estimatedDuration = calculateChunkDuration({
    wordCount,
    complexityScore,
    emphasisLevel: target.emphasisLevel,
    text: newText,
    wpm,
  });

  const updated = [...chunks];
  updated[chunkIndex] = {
    ...target,
    text: newText,
    wordCount,
    complexityScore,
    estimatedDuration,
  };

  return updated;
}
