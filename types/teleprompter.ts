export type TeleprompterMode = 'manual' | 'smart_pace' | 'voice_follow' | 'adaptive';

export type PlaybackState = 'idle' | 'playing' | 'paused' | 'completed';

export type DynamicCaptionMode = 'phrase_focus' | 'word_follow' | 'cinematic_minimal';

export type PronunciationStrictness = 'natural' | 'balanced' | 'precise';

export type CognitiveState =
  | 'READY'
  | 'LISTENING'
  | 'FOLLOWING'
  | 'PREDICTING'
  | 'THINKING'
  | 'UNCERTAIN'
  | 'RECOVERING'
  | 'CORRECTING'
  | 'PAUSED'
  | 'FINISHED'
  // Lowercase aliases for backward compatibility
  | 'ready'
  | 'speaking'
  | 'thinking'
  | 'tracking'
  | 'uncertain'
  | 'paused'
  | 'finished';

export type RecoveryState =
  | 'CONFIDENT'
  | 'UNCERTAIN'
  | 'RECOVERING'
  | 'RECOVERED'
  | 'LOST';

export type WordHighlightStatus = 'confirmed' | 'predicted' | 'uncertain';

export interface SpeechRhythmState {
  currentWPM: number;
  rollingWPM: number;
  smoothedWPM: number;
  speechAcceleration: number;
  pauseProbability: number;
  readingStability: number;
  wordIntervalMs: number;
}

export interface PredictiveTrackingState {
  confirmedWordIndex: number;
  predictedWordIndex: number | null;
  predictedPhraseIndex: number | null;
  highlightStatus: WordHighlightStatus;
  confidence: number;
  matchingScore: number;
  direction: 'forward' | 'hold' | 'rewind';
}

export interface TelemetryData {
  speechWPM: number;
  smoothedWPM: number;
  currentWordIndex: number;
  currentPhraseIndex: number;
  predictedWordIndex: number | null;
  confidence: number;
  matchingScore: number;
  recoveryState: string;
  cognitiveState: string;
  currentOffset: number;
  targetOffset: number;
  offsetDelta: number;
  animationFPS: number;
}

export interface ReadingTimeData {
  elapsedSeconds: number;
  totalEstimatedSeconds: number;
  remainingSeconds: number;
  progressPercentage: number;
  formattedElapsed: string;
  formattedRemaining: string;
  formattedEstimatedTotal: string;
}

export type FocusPosition = 'lens_proximity' | 'center';

export interface Chunk {
  id: string;
  order: number;
  text: string;
  wordCount: number;
  complexityScore: number;
  emphasisLevel: number;
  estimatedDuration: number; // in seconds
  importantWords?: string[]; // Words marked with [bracket] requiring precise pronunciation
}

export interface PronunciationFeedback {
  status: 'none' | 'correct' | 'unclear' | 'mispronounced';
  targetWord: string;
  detectedWord: string;
  attemptCount: number;
  allowSkip: boolean;
  similarity: number;
}

export interface TeleprompterSettings {
  fontSize: number; // in px (e.g. 24 - 72)
  speedMultiplier: number; // e.g. 0.5 to 2.0
  defaultWpm: number; // default 140
  mode: TeleprompterMode;
  captionMode: DynamicCaptionMode; // 'phrase_focus' | 'word_follow' | 'cinematic_minimal'
  pronunciationStrictness: PronunciationStrictness; // 'natural' | 'balanced' | 'precise'
  audioFeedbackEnabled: boolean; // Optional subtle audio tone (default false)
  pronunciationCoachEnabled: boolean; // Local statistics logging (default true)
  theme: 'dark' | 'obsidian' | 'high_contrast';
  mirrorMode: boolean;
  focusPosition: FocusPosition; // 'lens_proximity' keeps active line near the smartphone camera lens!
  lineLength: 'compact' | 'normal' | 'wide';
  highlightAccent: 'subtle_amber' | 'soft_cyan' | 'pure_white';
}

export interface TeleprompterMetrics {
  totalWords: number;
  totalCharacters: number;
  estimatedTotalSeconds: number;
  formattedDuration: string;
}

export interface PronunciationStats {
  wordsPracticed: number;
  wordsCorrect: number;
  wordsUnclear: number;
  wordsCorrected: number;
  troubledWords: { word: string; count: number }[];
}

export interface OrientationState {
  isLandscape: boolean;
  viewportWidth: number;
  viewportHeight: number;
}
