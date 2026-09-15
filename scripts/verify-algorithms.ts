/**
 * Standalone algorithm verification script for Focus Teleprompter v4.
 * Tests Smart Chunking, Auto-Pacing, Fuzzy Matching, and Decision Engine rules.
 */

import { countWords, calculateComplexityScore, getScriptMetrics, formatDuration } from '../lib/script/metrics';
import { createReadingChunks, splitChunk, mergeChunks, normalizeText, parseSentences } from '../lib/script/chunking';
import { calculateChunkDuration } from '../lib/pacing/pacingCalculator';
import { matchTranscriptToChunks, tokenize, calculateTokenSimilarity } from '../lib/tracking/fuzzyMatch';
import { evaluateEngineTick } from '../lib/engine/decisionEngine';

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

console.log('\n--- 3. Testing Chunk Splitting & Merging ---');
const splitted = splitChunk(portraitChunks, 0, 2, 140);
assert(splitted.length === portraitChunks.length + 1, 'Splitting chunk increases total chunk count by 1');
const merged = mergeChunks(splitted, 0, 140);
assert(merged.length === portraitChunks.length, 'Merging restored original chunk count');

console.log('\n--- 4. Testing Auto-Pacing Calculations ---');
const shortDuration = calculateChunkDuration({ wordCount: 4, wpm: 140, speedMultiplier: 1.0 });
const longDuration = calculateChunkDuration({ wordCount: 12, wpm: 140, speedMultiplier: 1.0 });
assert(longDuration > shortDuration, `Longer chunk has longer duration (${longDuration}s > ${shortDuration}s)`);
const fastMultiplierDuration = calculateChunkDuration({ wordCount: 10, wpm: 140, speedMultiplier: 1.5 });
const normalMultiplierDuration = calculateChunkDuration({ wordCount: 10, wpm: 140, speedMultiplier: 1.0 });
assert(fastMultiplierDuration < normalMultiplierDuration, `Speed multiplier 1.5x reduces chunk duration (${fastMultiplierDuration}s < ${normalMultiplierDuration}s)`);

console.log('\n--- 5. Testing Sliding-Window Fuzzy Matching ---');
const spokenTokens = tokenize('Halo teman creator');
const targetTokens = tokenize('Halo teman-teman creator!');
const sim = calculateTokenSimilarity(spokenTokens, targetTokens);
assert(sim >= 0.65, `Token similarity detects match despite hyphenation (got ${sim.toFixed(2)})`);

const matchResult = matchTranscriptToChunks('selamat datang di focus teleprompter', portraitChunks, 0);
assert(matchResult.matchedIndex !== null, `Sliding window matched next chunk (index: ${matchResult.matchedIndex}, confidence: ${matchResult.confidence})`);

console.log('\n--- 6. Testing Adaptive Decision Engine Rules ---');
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

// Rule: Face Away beyond grace triggers HOLD/PAUSE
const faceAwayDecision = evaluateEngineTick({
  mode: 'adaptive',
  playbackState: 'playing',
  chunks: portraitChunks,
  currentChunkIndex: 0,
  elapsedSeconds: 0.5,
  voiceStatus: 'speaking',
  voiceMatchedChunkIndex: null,
  voiceConfidence: 0,
  faceStatus: 'away',
});
assert(faceAwayDecision.action === 'HOLD' && faceAwayDecision.reason === 'FACE_AWAY', 'Face away triggers HOLD with FACE_AWAY');

// Rule: Confirmed Voice Match triggers ADVANCE
const voiceAdvanceDecision = evaluateEngineTick({
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
assert(voiceAdvanceDecision.action === 'ADVANCE' && voiceAdvanceDecision.targetChunkIndex === 1, 'Confirmed voice match triggers ADVANCE to target chunk');

// Rule: Timer expiry triggers ADVANCE in smart pace
const timerAdvanceDecision = evaluateEngineTick({
  mode: 'smart_pace',
  playbackState: 'playing',
  chunks: portraitChunks,
  currentChunkIndex: 0,
  elapsedSeconds: 10.0, // well beyond chunk duration
  voiceStatus: 'off',
  voiceMatchedChunkIndex: null,
  voiceConfidence: 0,
  faceStatus: 'off',
});
assert(timerAdvanceDecision.action === 'ADVANCE' && timerAdvanceDecision.reason === 'TIMER_EXPIRED', 'Timer expiry in smart_pace advances chunk');

console.log('\n🎉 ALL ALGORITHM AND DECISION ENGINE TESTS PASSED!\n');
