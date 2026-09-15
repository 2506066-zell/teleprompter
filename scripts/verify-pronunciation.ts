/**
 * Verification Script for Pronunciation-Aware Voice Tracking
 * Tests phonetic representations, Indonesian colloquial equivalence,
 * multi-signal evaluation, strictness thresholds, and retry/skip logic.
 */

import {
  toIndonesianPhonetic,
  calculatePhoneticSimilarity,
  isColloquialEquivalent,
  extractImportantWords,
} from '../lib/tracking/phonetics';
import { evaluatePronunciation } from '../lib/tracking/pronunciationEngine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('--- 1. Testing Indonesian Phonetic Normalization ---');

// v vs f
const vSim = calculatePhoneticSimilarity('produktifitas', 'produktivitas');
console.log(`Similarity ('produktifitas' vs 'produktivitas'): ${vSim}`);
assert(vSim >= 0.90, 'v vs f phonetic similarity should be >= 0.90');

// efektif vs efektip
const pSim = calculatePhoneticSimilarity('efektip', 'efektif');
console.log(`Similarity ('efektip' vs 'efektif'): ${pSim}`);
assert(pSim >= 0.90, 'efektif vs efektip similarity should be >= 0.90');

// sy vs s
const sySim = calculatePhoneticSimilarity('masarakat', 'masyarakat');
console.log(`Similarity ('masarakat' vs 'masyarakat'): ${sySim}`);
assert(sySim >= 0.90, 'masarakat vs masyarakat similarity should be >= 0.90');

// z vs j
const zSim = calculatePhoneticSimilarity('jaman', 'zaman');
console.log(`Similarity ('jaman' vs 'zaman'): ${zSim}`);
assert(zSim >= 0.90, 'jaman vs zaman similarity should be >= 0.90');

console.log('\n--- 2. Testing Indonesian Colloquial Equivalence ---');
assert(isColloquialEquivalent('tidak', 'nggak'), 'tidak <=> nggak');
assert(isColloquialEquivalent('tidak', 'gak'), 'tidak <=> gak');
assert(isColloquialEquivalent('sudah', 'udah'), 'sudah <=> udah');
assert(isColloquialEquivalent('pakai', 'pake'), 'pakai <=> pake');
assert(
  calculatePhoneticSimilarity('gak', 'tidak') === 1.0,
  'Colloquial equivalent returns 1.0 similarity'
);

console.log('\n--- 3. Testing Special Terminology Extraction ---');
const rawChunk = 'Saya menggunakan [AI] dan [Supabase] untuk [Neuroscience].';
const { cleanText, importantWords } = extractImportantWords(rawChunk);
console.log(`Clean text: "${cleanText}"`);
console.log(`Extracted terms:`, importantWords);
assert(cleanText === 'Saya menggunakan AI dan Supabase untuk Neuroscience.', 'Clean text removes brackets');
assert(importantWords.length === 3, 'Found 3 special terms');
assert(importantWords.includes('AI') && importantWords.includes('Supabase') && importantWords.includes('Neuroscience'), 'Extracted correct terms');

console.log('\n--- 4. Testing Multi-Signal Pronunciation Evaluation ---');

// Test Case A: CORRECT (produktivitas vs produktifitas in Balanced mode)
const resultA = evaluatePronunciation({
  targetWord: 'produktivitas',
  detectedTranscript: 'kami meningkatkan produktifitas kerja',
  surroundingWords: ['kami', 'meningkatkan', 'produktivitas', 'kerja'],
  speechConfidence: 0.88,
  strictness: 'balanced',
});
console.log('Result A (produktivitas):', resultA.status, resultA.feedbackMessage);
assert(resultA.status === 'correct', 'produktifitas accepted as correct for produktivitas in balanced mode');

// Test Case B: UNCLEAR (Low recognition confidence, ambiguous audio)
const resultB = evaluatePronunciation({
  targetWord: 'produktivitas',
  detectedTranscript: 'kami meningkatkan produktif',
  speechConfidence: 0.50, // low confidence
  strictness: 'balanced',
});
console.log('Result B (unclear):', resultB.status, resultB.feedbackMessage);
assert(resultB.status === 'unclear', 'Low confidence speech returns UNCLEAR');
assert(resultB.feedbackMessage.includes('Kurang jelas'), 'Gives gentle hold message');

// Test Case C: MISPRONOUNCED (Spoken completely different word)
const resultC = evaluatePronunciation({
  targetWord: 'efektif',
  detectedTranscript: 'proses belajar yang lambat',
  speechConfidence: 0.89,
  strictness: 'balanced',
});
console.log('Result C (mismatch):', resultC.status, resultC.feedbackMessage);
assert(resultC.status === 'mispronounced', 'Different word returns MISPRONOUNCED');
assert(resultC.feedbackMessage.includes('efektif'), 'Provides target word for retry');

// Test Case D: Retry logic & allowSkip
const retry1 = evaluatePronunciation({
  targetWord: 'efektif',
  detectedTranscript: 'berbeda',
  strictness: 'balanced',
  currentAttempt: 0,
});
assert(retry1.attemptCount === 1, 'First attempt count is 1');
assert(retry1.allowSkip === false, 'First attempt cannot skip yet');

const retry2 = evaluatePronunciation({
  targetWord: 'efektif',
  detectedTranscript: 'berbeda',
  strictness: 'balanced',
  currentAttempt: 1,
});
console.log('Retry 2 allowSkip:', retry2.allowSkip);
assert(retry2.attemptCount === 2, 'Second attempt count is 2');
assert(retry2.allowSkip === true, 'Second attempt allows non-blocking skip');

// Test Case E: Special Terminology Elevation
const termTest = evaluatePronunciation({
  targetWord: 'JavaScript',
  detectedTranscript: 'java',
  strictness: 'natural',
  isImportantTerm: true, // Marked term elevates threshold to precise
});
console.log('Special Term test status:', termTest.status);
assert(termTest.status !== 'correct', 'Important term requires precise match even in natural mode');

console.log('\n🎉 ALL PRONUNCIATION ALGORITHM TESTS PASSED SUCCESSFULLY!');
