export type TeleprompterMode = 'manual' | 'smart_pace' | 'voice_follow' | 'adaptive';

export type PlaybackState = 'idle' | 'playing' | 'paused' | 'completed';

export type CognitiveState =
  | 'ready'       // User is positioned, teleprompter ready to start
  | 'speaking'    // Voice actively detected and driving text
  | 'thinking'    // Natural cognitive pause (face present, silence), system holds quietly
  | 'tracking'    // High-confidence algorithmic match
  | 'uncertain'   // Speech detected but ambiguous match; holding steady without jumping
  | 'paused'      // User manually paused or face away beyond grace period
  | 'finished';   // Script reached the end

export type FocusPosition = 'lens_proximity' | 'center';

export interface Chunk {
  id: string;
  order: number;
  text: string;
  wordCount: number;
  complexityScore: number;
  emphasisLevel: number;
  estimatedDuration: number; // in seconds
}

export interface TeleprompterSettings {
  fontSize: number; // in px (e.g. 24 - 72)
  speedMultiplier: number; // e.g. 0.5 to 2.0
  defaultWpm: number; // default 140
  mode: TeleprompterMode;
  theme: 'dark' | 'obsidian' | 'high_contrast';
  mirrorMode: boolean;
  focusPosition: FocusPosition; // 'lens_proximity' keeps active line near the smartphone camera lens!
  lineLength: 'compact' | 'normal' | 'wide';
}

export interface TeleprompterMetrics {
  totalWords: number;
  totalCharacters: number;
  estimatedTotalSeconds: number;
  formattedDuration: string;
}

export interface OrientationState {
  isLandscape: boolean;
  viewportWidth: number;
  viewportHeight: number;
}
