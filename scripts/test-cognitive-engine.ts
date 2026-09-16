import { SpeechRhythmModel } from '../lib/tracking/rhythmModel';
import { scoreWordMatch, matchTranscriptSemantically } from '../lib/tracking/semanticMatcher';
import { RecoveryEngine } from '../lib/tracking/recoveryEngine';
import { AdaptivePacingEngine } from '../lib/engine/adaptivePacingEngine';
import { transitionCognitiveState, getCognitiveStateDisplay } from '../lib/engine/cognitiveStateMachine';
import { Chunk } from '../types/teleprompter';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('--- 1. Testing SpeechRhythmModel ---');
const rhythm = new SpeechRhythmModel();
const now = Date.now();
// Simulate words spoken at ~140-150 WPM
rhythm.recordWord('halo', 0.9, now - 2000);
rhythm.recordWord('semuanya', 0.9, now - 1500);
rhythm.recordWord('selamat', 0.9, now - 1000);
rhythm.recordWord('datang', 0.9, now - 500);
rhythm.recordWord('kembali', 0.9, now);

const rhythmState = rhythm.computeCurrentMetrics();
assert(rhythmState.smoothedWPM > 80 && rhythmState.smoothedWPM < 220, `Smoothed WPM is reasonable: ${rhythmState.smoothedWPM}`);
assert(rhythmState.pauseProbability >= 0 && rhythmState.pauseProbability <= 1, 'Pause probability is bounded in [0, 1]');

console.log('\n--- 2. Testing SemanticMatcher ---');
// 2.1 Exact & case insensitive
const m1 = scoreWordMatch('halo', 'Halo');
assert(m1.isExact && m1.score === 1.0, 'Exact case-insensitive match has score 1.0');

// 2.2 Colloquial equivalence (Indonesian informal)
const m2 = scoreWordMatch('nggak', 'tidak');
assert(m2.isColloquial && m2.score >= 0.9, `Colloquial 'nggak' matches 'tidak' with score ${m2.score}`);

const m3 = scoreWordMatch('udah', 'sudah');
assert(m3.isColloquial && m3.score >= 0.9, `Colloquial 'udah' matches 'sudah' with score ${m3.score}`);

// 2.3 Phonetic similarity (f/v, etc.)
const m4 = scoreWordMatch('fokus', 'focus');
assert(m4.score >= 0.75, `Phonetic 'fokus' matches 'focus' with score ${m4.score}`);

// 2.4 Semantic Transcript Matching with Predictive Next Word
const testChunks: Chunk[] = [
  { id: '1', order: 1, text: 'Selamat datang di studio kami.', wordCount: 5, complexityScore: 0, emphasisLevel: 0, estimatedDuration: 2.0 },
  { id: '2', order: 2, text: 'Hari ini kita akan membahas teleprompter kognitif.', wordCount: 7, complexityScore: 0, emphasisLevel: 0, estimatedDuration: 3.0 },
  { id: '3', order: 3, text: 'Sistem ini membaca ritme suara Anda.', wordCount: 6, complexityScore: 0, emphasisLevel: 0, estimatedDuration: 2.5 },
];

const matchRes = matchTranscriptSemantically('selamat datang di studio kami hari ini', testChunks, 0, 0);
assert(matchRes.bestMatch !== null, 'Semantic match found best match candidate');
assert(matchRes.predictedNextWordIndex !== null, 'Semantic matcher generates predictedNextWordIndex');

console.log('\n--- 3. Testing RecoveryEngine ---');
const recovery = new RecoveryEngine();
assert(recovery.getState() === 'CONFIDENT', 'Initial recovery state is CONFIDENT');

// Good match evaluation
const eval1 = recovery.evaluate(
  {
    bestMatch: { chunkIndex: 0, wordIndex: 2, confidence: 0.95, score: 0.95, matchedSpokenToken: 'di', matchedScriptWord: 'di', isExact: true, isPhonetic: false, isColloquial: false },
    predictedNextWordIndex: 3,
    predictedNextChunkIndex: 0,
    confidence: 0.95,
    matchingScore: 0.95,
    isConfident: true,
    direction: 'forward',
    localCandidates: [],
  },
  0,
  1
);
assert(eval1.state === 'CONFIDENT' && eval1.shouldAdvance, 'Recovery evaluates confident match successfully');

// Consecutive low-confidence matches -> transitions to UNCERTAIN and then RECOVERING
// 1st failure: Protected by anti-glitch hysteresis, remains CONFIDENT
recovery.evaluate(
  { bestMatch: null, predictedNextWordIndex: null, predictedNextChunkIndex: null, confidence: 0.2, matchingScore: 0.2, isConfident: false, direction: 'hold', localCandidates: [] },
  0,
  2
);
assert(recovery.getState() === 'CONFIDENT', 'Anti-glitch hysteresis protects single momentary dropout');

// 2nd failure: transitions to UNCERTAIN
recovery.evaluate(
  { bestMatch: null, predictedNextWordIndex: null, predictedNextChunkIndex: null, confidence: 0.2, matchingScore: 0.2, isConfident: false, direction: 'hold', localCandidates: [] },
  0,
  2
);
assert(recovery.getState() === 'UNCERTAIN', 'State transitions to UNCERTAIN after 2 consecutive low-confidence matches');

// 3rd & 4th failure: transitions to RECOVERING
recovery.evaluate(
  { bestMatch: null, predictedNextWordIndex: null, predictedNextChunkIndex: null, confidence: 0.2, matchingScore: 0.2, isConfident: false, direction: 'hold', localCandidates: [] },
  0,
  2
);
recovery.evaluate(
  { bestMatch: null, predictedNextWordIndex: null, predictedNextChunkIndex: null, confidence: 0.2, matchingScore: 0.2, isConfident: false, direction: 'hold', localCandidates: [] },
  0,
  2
);
assert(recovery.getState() === 'RECOVERING', 'State transitions to RECOVERING after 4 consecutive failures');

// Recovery holds position instead of jumping erratically
const jumpEval = recovery.evaluate(
  {
    bestMatch: { chunkIndex: 5, wordIndex: 0, confidence: 0.4, score: 0.4, matchedSpokenToken: 'xyz', matchedScriptWord: 'abc', isExact: false, isPhonetic: false, isColloquial: false },
    predictedNextWordIndex: null,
    predictedNextChunkIndex: null,
    confidence: 0.4,
    matchingScore: 0.4,
    isConfident: false,
    direction: 'forward',
    localCandidates: [],
  },
  0,
  2
);
assert(!jumpEval.shouldAdvance && jumpEval.action === 'HOLD', 'RecoveryEngine holds position during erratic low-confidence jump attempt');

console.log('\n--- 4. Testing AdaptivePacingEngine ---');
// Distance aware transit calculation
const dur0 = AdaptivePacingEngine.calculateMovementDuration(0);
const dur100 = AdaptivePacingEngine.calculateMovementDuration(100);
const dur400 = AdaptivePacingEngine.calculateMovementDuration(400);

assert(dur0 === 190, `Duration at diff 0 is base 190ms: ${dur0}ms`);
assert(dur100 > dur0 && dur100 <= 300, `Duration scales smoothly with distance: ${dur100}ms`);
assert(dur400 === 430 || dur400 === 450, `Duration scales up smoothly for large deltas: ${dur400}ms`);

// Test Core Mandate: Silence means HOLD!
const pacingHold = AdaptivePacingEngine.evaluate({
  mode: 'voice_follow',
  currentChunk: testChunks[0],
  rhythm: rhythmState,
  elapsedOnChunk: 1.5,
  isSpeaking: false, // User is silent!
  trackingConfidence: 0.9,
  distancePixels: 0,
});
assert(pacingHold.action === 'HOLD', 'Core Mandate: Silence in voice_follow mode strictly results in HOLD');
assert(pacingHold.pauseType !== 'none', `Pause type detected during silence: ${pacingHold.pauseType}`);

console.log('\n--- 5. Testing CognitiveStateMachine ---');
const cs1 = transitionCognitiveState('FOLLOWING', {
  playbackState: 'playing',
  currentChunkIndex: 0,
  totalChunks: 3,
  voiceStatus: 'speaking',
  voiceConfidence: 0.9,
  recoveryState: 'CONFIDENT',
  isPredicting: true,
  hasPronunciationFeedback: false,
  faceStatus: 'active',
  isCompleted: false,
});
assert(cs1 === 'PREDICTING', `State is PREDICTING when confident and predicting: ${cs1}`);

const cs2 = transitionCognitiveState('FOLLOWING', {
  playbackState: 'playing',
  currentChunkIndex: 0,
  totalChunks: 3,
  voiceStatus: 'silence',
  voiceConfidence: 0.8,
  recoveryState: 'CONFIDENT',
  isPredicting: false,
  hasPronunciationFeedback: false,
  faceStatus: 'active',
  isCompleted: false,
});
assert(cs2 === 'THINKING', `State is THINKING during silence: ${cs2}`);

const displayPredicting = getCognitiveStateDisplay('PREDICTING');
assert(displayPredicting.label === 'PREDICTING', 'Display label for PREDICTING is correct');

const displayFollowing = getCognitiveStateDisplay('FOLLOWING');
assert(displayFollowing.label === 'FOLLOWING', 'Display label for FOLLOWING is correct');

console.log('\n========================================');
console.log('🎉 ALL ADAPTIVE COGNITIVE TESTS PASSED!');
console.log('========================================');
