export type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'unsupported';

export type VoiceStatus = 'off' | 'listening' | 'speaking' | 'silence' | 'error' | 'unsupported';

export type FaceStatus = 'off' | 'loading' | 'active' | 'thinking' | 'away' | 'error' | 'unsupported';

export interface VoiceTrackingEvent {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  matchedChunkIndex: number | null;
  similarityScore: number;
  timestamp: number;
}

export interface FaceTrackingEvent {
  isPresent: boolean;
  attentionScore: number; // 0.0 to 1.0
  state: 'ACTIVE' | 'THINKING' | 'AWAY';
  headDirection: 'center' | 'left' | 'right' | 'up' | 'down';
  timestamp: number;
}

export interface EngineTickDecision {
  action: 'ADVANCE' | 'HOLD' | 'PAUSE' | 'RESUME';
  targetChunkIndex?: number;
  reason: 'VOICE_MATCH' | 'TIMER_EXPIRED' | 'FACE_AWAY' | 'SILENCE_HOLD' | 'MANUAL_OVERRIDE' | 'COMPLETED';
}
