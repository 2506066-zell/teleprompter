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
 * Checks if a sequence of words starting at index `startIndex` matches any
 * conjunction in the dictionary (supports 1, 2, or 3 word conjunction phrases).
 */
function findMatchingConjunctionLength(
  words: string[],
  startIndex: number,
  conjunctionsSet: Set<string>
): number {
  const cleanTokens = words.slice(startIndex, startIndex + 3).map((w) =>
    w.toLowerCase().replace(/[^a-z0-9]/g, '')
  );

  // Check 3-word phrase first (e.g. "oleh karena itu", "di sisi lain")
  if (cleanTokens.length >= 3) {
    const phrase3 = `${cleanTokens[0]} ${cleanTokens[1]} ${cleanTokens[2]}`;
    if (conjunctionsSet.has(phrase3)) return 3;
  }

  // Check 2-word phrase (e.g. "selain itu", "so that", "sebab itu")
  if (cleanTokens.length >= 2) {
    const phrase2 = `${cleanTokens[0]} ${cleanTokens[1]}`;
    if (conjunctionsSet.has(phrase2)) return 2;
  }

  // Check 1-word conjunction (e.g. "dan", "namun", "karena", "sehingga")
  if (cleanTokens.length >= 1 && conjunctionsSet.has(cleanTokens[0])) {
    return 1;
  }

  return 0;
}

/**
 * Splits text by natural Indonesian and English conjunctions when it exceeds reading limits.
 */
function splitByConjunctions(
  text: string,
  limits: { idealMin: number; idealMax: number; hardMax: number },
  conjunctionsSet: Set<string>
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= limits.idealMax) {
    return [text];
  }

  const resultChunks: string[] = [];
  let currentWords: string[] = [];
  let i = 0;

  while (i < words.length) {
    const conjLen = findMatchingConjunctionLength(words, i, conjunctionsSet);

    // If we hit a natural conjunction boundary and currentWords has enough substance
    if (conjLen > 0 && currentWords.length >= limits.idealMin) {
      resultChunks.push(currentWords.join(' '));
      currentWords = [];
      for (let k = 0; k < conjLen; k++) {
        currentWords.push(words[i + k]);
      }
      i += conjLen;
      continue;
    }

    // If reaching hardMax limit without finding a conjunction, break at natural point
    if (currentWords.length >= limits.hardMax) {
      resultChunks.push(currentWords.join(' '));
      currentWords = [];
    }

    currentWords.push(words[i]);
    i++;
  }

  if (currentWords.length > 0) {
    // If the trailing chunk is too small (< 3 words) and can fit into previous chunk, merge it
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

  return resultChunks.length > 0 ? resultChunks : [text];
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

  const conjunctionsSet = new Set(
    [...INDONESIAN_CONJUNCTIONS, ...ENGLISH_CONJUNCTIONS].map((c) => c.toLowerCase().trim())
  );

  // 1. Try splitting by soft punctuation (, ; : — –)
  const softSegments = sentence
    .split(/([,;:–—]+)/)
    .filter(Boolean);

  let initialSegments: string[] = [];

  if (softSegments.length > 1) {
    let current = '';

    for (let i = 0; i < softSegments.length; i++) {
      const part = softSegments[i];
      if (/^[,;:–—]+$/.test(part)) {
        current += part;
      } else {
        if (current && countWords(current + ' ' + part) > limits.hardMax) {
          initialSegments.push(current.trim());
          current = part.trim();
        } else {
          current = current ? `${current} ${part.trim()}` : part.trim();
        }
      }
    }
    if (current.trim()) {
      initialSegments.push(current.trim());
    }
  } else {
    initialSegments = [sentence];
  }

  // 2. Further split any segments that still exceed hardMax using natural conjunctions
  const finalChunks: string[] = [];
  for (const seg of initialSegments) {
    if (countWords(seg) > limits.hardMax) {
      const subChunks = splitByConjunctions(seg, limits, conjunctionsSet);
      finalChunks.push(...subChunks);
    } else {
      finalChunks.push(seg);
    }
  }

  return finalChunks.length > 0 ? finalChunks : [sentence];
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
