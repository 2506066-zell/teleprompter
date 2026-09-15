/**
 * Standalone algorithm verification script for Focus Teleprompter v4.
 * Tests Smart Chunking, Auto-Pacing, Dynamic Caption Word Matching, Anti-Jump Rules, and Decision Engine.
 */

import { countWords, calculateComplexityScore, getScriptMetrics, formatDuration } from '../lib/script/metrics';
import { createReadingChunks, splitChunk, mergeChunks, parseSentences } from '../lib/script/chunking';
import { calculateChunkDuration } from '../lib/pacing/pacingCalculator';
import { matchTranscriptToChunks, tokenize, calculateTokenSimilarity, findActiveWordInChunk } from '../lib/tracking/fuzzyMatch';
import { evaluateEngineTick, deriveCognitiveState } from '../lib/engine/decisionEngine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('\n--- 1. Testing Metrics & Formatting ---');
assert(countWords('Halo teman-teman creator!') === 3, 'Word count computes 3 words');
assert(formatDuration(125) === '2:05', 'Format duration formats 125 seconds to 2:05');
const complexScore = calculateComplexityScore('Konseptualisasi teleprompter adaptif memerlukan orkestrasionalitas tinggi.');
assert(complexScore >= 1.15, `Complexity score correctly elevates for dense syllables (got: ${complexScore})`);

console.log('\n--- 2. Testing Smart Chunking Pipeline ---');
const sampleParagraph = 'Halo teman-teman creator! Selamat datang di Focus Teleprompter. Ini adalah solusi teleprompter adaptif modern.';
const sentences = parseSentences(sampleParagraph);
assert(sentences.length === 3, `Sentence parser detected 3 sentences (got: ${sentences.length})`);

const portraitChunks = createReadingChunks(sampleParagraph, 'portrait', 140);
assert(portraitChunks.length >= 3, `Generated at least 3 reading chunks (got: ${portraitChunks.length})`);
portraitChunks.forEach((chunk, i) => {
  assert(chunk.wordCount <= 16, `Chunk #${i + 1} respects portrait hard max of 16 words (got ${chunk.wordCount})`);
  assert(chunk.estimatedDuration >= 1.2, `Chunk #${i + 1} has sensible minimum duration (got ${chunk.estimatedDuration}s)`);
});

console.log('\n--- 3. Testing Dynamic Caption Word Matching ---');
const chunkWords = ['saya', 'menggunakan', 'artificial', 'intelligence', 'untuk', 'belajar'];
const spokenTokens = tokenize('saya menggunakan artificial');
const activeWord = findActiveWordInChunk(spokenTokens, chunkWords);
assert(activeWord === 2, `Word-level matching accurately identified active word index 2 ('artificial') (got: ${activeWord})`);

console.log('\n--- 4. Testing Anti-Jump Sliding-Window Fuzzy Matching ---');
const matchResult = matchTranscriptToChunks('selamat datang di focus teleprompter', portraitChunks, 0);
assert(matchResult.matchedIndex !== null, `Sliding window matched next chunk (index: ${matchResult.matchedIndex}, confidence: ${matchResult.confidence})`);
assert(matchResult.isConfident === true, 'Match result flagged as confident');

// Distant unrelated speech should NOT cause a jump
const unrelatedMatch = matchTranscriptToChunks('cuaca hari ini sangat cerah sekali', portraitChunks, 0);
assert(unrelatedMatch.matchedIndex === null, 'Anti-jump system rejected distant unrelated speech');

console.log('\n--- 5. Testing Cognitive States & Decision Engine Rules ---');
// Rule: Silence means HOLD
const silenceDecision = evaluateEngineTick({
  mode: 'adaptive',
  playbackState: 'playing',
  chunks: portraitChunks,
  currentChunkIndex: 0,
  elapsedSeconds: 0.5,
  voiceStatus: 'silence',
  voiceMatchedChunkIndex: null,
  voiceConfidence: 0,
  faceStatus: 'active',
});
assert(silenceDecision.action === 'HOLD' && silenceDecision.reason === 'SILENCE_HOLD', 'Silence rule strictly produces HOLD');

// Cognitive State: Uncertain
const uncertainState = deriveCognitiveState({
  mode: 'adaptive',
  playbackState: 'playing',
  chunks: portraitChunks,
  currentChunkIndex: 0,
  elapsedSeconds: 0.5,
  voiceStatus: 'speaking',
  voiceMatchedChunkIndex: null,
  voiceConfidence: 0.45, // low confidence
  faceStatus: 'active',
});
assert(uncertainState === 'uncertain', `Low confidence speech produces cognitive state 'uncertain' (got: ${uncertainState})`);

// Cognitive State: Tracking
const trackingState = deriveCognitiveState({
  mode: 'adaptive',
  playbackState: 'playing',
  chunks: portraitChunks,
  currentChunkIndex: 0,
  elapsedSeconds: 0.5,
  voiceStatus: 'speaking',
  voiceMatchedChunkIndex: 1,
  voiceConfidence: 0.85,
  faceStatus: 'active',
});
assert(trackingState === 'tracking', `High confidence speech produces cognitive state 'tracking' (got: ${trackingState})`);

console.log('\n🎉 ALL DYNAMIC CAPTION & ALGORITHM TESTS PASSED!\n');
