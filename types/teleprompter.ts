export type TeleprompterMode = 'manual' | 'smart_pace' | 'voice_follow' | 'adaptive';

export type PlaybackState = 'idle' | 'playing' | 'paused' | 'completed';

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
