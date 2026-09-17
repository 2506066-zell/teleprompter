'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Chunk,
  PlaybackState,
  TeleprompterMode,
  TeleprompterSettings,
  CognitiveState,
  FocusPosition,
  DynamicCaptionMode,
  ReadingTimeData,
  TelemetryData,
  WordHighlightStatus,
} from '@/types/teleprompter';
import { DEFAULT_SETTINGS } from '@/constants/defaults';
import { evaluateEngineTick, deriveCognitiveState } from '@/lib/engine/decisionEngine';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useFaceTracking } from './useFaceTracking';
import { useWakeLock } from './useWakeLock';

interface UseTeleprompterEngineOptions {
  chunks: Chunk[];
  initialSettings?: Partial<TeleprompterSettings>;
  onChunkChange?: (index: number) => void;
  onComplete?: () => void;
}

export function useTeleprompterEngine({
  chunks,
  initialSettings,
  onChunkChange,
  onComplete,
}: UseTeleprompterEngineOptions) {
  const [settings, setSettings] = useState<TeleprompterSettings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  });

  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(0);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [chunkElapsedSeconds, setChunkElapsedSeconds] = useState<number>(0);
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState<number>(0);
  const [lastHoldReason, setLastHoldReason] = useState<string>('');

  // Stabilized voice tracking integration
  const voice = useSpeechRecognition({
    chunks,
    currentChunkIndex,
    pronunciationStrictness: settings.pronunciationStrictness,
    audioFeedbackEnabled: settings.audioFeedbackEnabled,
    pronunciationCoachEnabled: settings.pronunciationCoachEnabled,
    onMatch: (matchedIndex, wordIndex) => {
      if (settings.mode === 'voice_follow' || settings.mode === 'adaptive') {
        if (matchedIndex !== currentChunkIndex) {
          goToChunk(matchedIndex, 'VOICE_MATCH');
        }
        setActiveWordIndex(wordIndex);
      }
    },
  });

  // Keep activeWordIndex synchronized with stabilized voice recognition when speaking
  useEffect(() => {
    if (
      (settings.mode === 'voice_follow' || settings.mode === 'adaptive') &&
      voice.status === 'speaking'
    ) {
      setActiveWordIndex(voice.activeWordIndex);
    }
  }, [voice.activeWordIndex, voice.status, settings.mode]);

  // Face tracking integration
  const face = useFaceTracking({
    enabled: settings.mode === 'adaptive' && playbackState === 'playing',
  });

  // Keep phone screen awake when teleprompter is playing
  useWakeLock(playbackState === 'playing');

  // Compute 10-state cognitive machine
  const cognitiveState = useMemo<CognitiveState>(() => {
    return deriveCognitiveState({
      mode: settings.mode,
      playbackState,
      chunks,
      currentChunkIndex,
      elapsedSeconds: chunkElapsedSeconds,
      voiceStatus: voice.status,
      voiceMatchedChunkIndex: voice.lastMatchedIndex,
      voiceConfidence: voice.confidence,
      faceStatus: face.status,
      recoveryState: voice.recoveryState,
      speechRhythm: voice.speechRhythm,
      hasPronunciationFeedback: Boolean(
        voice.pronunciationFeedback && voice.pronunciationFeedback.status !== 'none'
      ),
      isPredicting: Boolean(voice.predictedWordIndex !== null),
    });
  }, [
    settings.mode,
    playbackState,
    chunks,
    currentChunkIndex,
    chunkElapsedSeconds,
    voice.status,
    voice.lastMatchedIndex,
    voice.confidence,
    voice.recoveryState,
    voice.speechRhythm,
    voice.pronunciationFeedback,
    voice.predictedWordIndex,
    face.status,
  ]);

  // Adaptive caption mode resolution
  const resolvedCaptionMode = useMemo<DynamicCaptionMode>(() => {
    if (settings.mode === 'adaptive') {
      if (voice.confidence >= 0.70 && voice.status === 'speaking') {
        return 'word_follow';
      }
      return 'phrase_focus';
    }
    return settings.captionMode;
  }, [settings.mode, settings.captionMode, voice.confidence, voice.status]);

  // Independent Reading-Time / Time-Limit Indicator calculations
  const totalEstimatedSeconds = useMemo(() => {
    return chunks.reduce((sum, c) => sum + (c.estimatedDuration || 2), 0);
  }, [chunks]);

  const readingTimeData = useMemo<ReadingTimeData>(() => {
    const elapsed = Math.round(totalElapsedSeconds);
    const total = Math.round(totalEstimatedSeconds);
    const remaining = Math.max(0, total - elapsed);
    const progress = total > 0 ? Math.min(100, Math.round((elapsed / total) * 100)) : 0;

    const formatTime = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = Math.floor(secs % 60);
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return {
      elapsedSeconds: elapsed,
      totalEstimatedSeconds: total,
      remainingSeconds: remaining,
      progressPercentage: progress,
      formattedElapsed: formatTime(elapsed),
      formattedRemaining: formatTime(remaining),
      formattedEstimatedTotal: formatTime(total),
    };
  }, [totalElapsedSeconds, totalEstimatedSeconds]);

  // Ref mirror for tick loop
  const stateRef = useRef({
    currentChunkIndex,
    playbackState,
    chunkElapsedSeconds,
    settings,
    chunks,
    voiceStatus: voice.status,
    faceStatus: face.status,
    voiceRecoveryState: voice.recoveryState,
    speechRhythm: voice.speechRhythm,
  });

  stateRef.current = {
    currentChunkIndex,
    playbackState,
    chunkElapsedSeconds,
    settings,
    chunks,
    voiceStatus: voice.status,
    faceStatus: face.status,
    voiceRecoveryState: voice.recoveryState,
    speechRhythm: voice.speechRhythm,
  };

  const onChunkChangeRef = useRef(onChunkChange);
  onChunkChangeRef.current = onChunkChange;

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const goToChunk = useCallback((index: number, reason: string = 'MANUAL') => {
    const validIndex = Math.max(0, Math.min(chunks.length - 1, index));
    setCurrentChunkIndex(validIndex);
    setActiveWordIndex(0);
    setChunkElapsedSeconds(0);
    setLastHoldReason(reason);
    if (onChunkChangeRef.current) {
      onChunkChangeRef.current(validIndex);
    }
  }, [chunks.length]);

  const nextChunk = useCallback(() => {
    goToChunk(currentChunkIndex + 1, 'MANUAL_NEXT');
  }, [currentChunkIndex, goToChunk]);

  const prevChunk = useCallback(() => {
    goToChunk(currentChunkIndex - 1, 'MANUAL_PREV');
  }, [currentChunkIndex, goToChunk]);

  const play = useCallback(() => {
    if (chunks.length === 0) return;
    if (currentChunkIndex >= chunks.length - 1 && playbackState === 'completed') {
      setCurrentChunkIndex(0);
      setActiveWordIndex(0);
      setChunkElapsedSeconds(0);
      setTotalElapsedSeconds(0);
    }
    setPlaybackState('playing');

    if (settings.mode === 'voice_follow' || settings.mode === 'adaptive') {
      voice.startListening();
    }
  }, [chunks.length, currentChunkIndex, playbackState, settings.mode, voice]);

  const pause = useCallback(() => {
    setPlaybackState('paused');
    voice.stopListening();
  }, [voice]);

  const togglePlay = useCallback(() => {
    if (playbackState === 'playing') {
      pause();
    } else {
      play();
    }
  }, [playbackState, play, pause]);

  const restart = useCallback(() => {
    setCurrentChunkIndex(0);
    setActiveWordIndex(0);
    setChunkElapsedSeconds(0);
    setTotalElapsedSeconds(0);
    setPlaybackState('idle');
    voice.stopListening();
  }, [voice]);

  const updateSettings = useCallback((newSettings: Partial<TeleprompterSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const setFontSize = useCallback((fontSize: number) => {
    updateSettings({ fontSize });
  }, [updateSettings]);

  const setSpeedMultiplier = useCallback((speedMultiplier: number) => {
    updateSettings({ speedMultiplier });
  }, [updateSettings]);

  const setMode = useCallback((mode: TeleprompterMode) => {
    updateSettings({ mode });
    if (mode === 'manual' || mode === 'smart_pace') {
      voice.stopListening();
    }
  }, [updateSettings, voice]);

  const setCaptionMode = useCallback((captionMode: DynamicCaptionMode) => {
    updateSettings({ captionMode });
  }, [updateSettings]);

  const toggleMirrorMode = useCallback(() => {
    setSettings((prev) => ({ ...prev, mirrorMode: !prev.mirrorMode }));
  }, []);

  const setFocusPosition = useCallback((focusPosition: FocusPosition) => {
    updateSettings({ focusPosition });
  }, [updateSettings]);

  // Deterministic 100ms Tick Loop
  useEffect(() => {
    if (playbackState !== 'playing') return;

    const interval = setInterval(() => {
      const {
        currentChunkIndex: idx,
        chunkElapsedSeconds: elapsed,
        settings: s,
        chunks: chs,
        voiceStatus: vs,
        faceStatus: fs,
        voiceRecoveryState: rs,
        speechRhythm: rhythm,
      } = stateRef.current;

      const currentChunk = chs[idx];
      if (!currentChunk) return;

      // Update total elapsed reading session timer
      setTotalElapsedSeconds((prev) => prev + 0.1);

      // In smart pace or silence, interpolate activeWordIndex smoothly based on pacing
      if (vs !== 'speaking' && s.mode !== 'manual') {
        const words = currentChunk.text.split(/\s+/).filter(Boolean);
        const totalWords = words.length || 1;
        const duration = Math.max(0.1, currentChunk.estimatedDuration);
        const progress = Math.min(1.0, elapsed / duration);
        const estimatedWordIdx = Math.min(totalWords - 1, Math.floor(progress * totalWords));
        setActiveWordIndex((prev) => (prev !== estimatedWordIdx ? estimatedWordIdx : prev));
      }

      const decision = evaluateEngineTick({
        mode: s.mode,
        playbackState: 'playing',
        chunks: chs,
        currentChunkIndex: idx,
        elapsedSeconds: elapsed,
        voiceStatus: vs,
        voiceMatchedChunkIndex: voice.lastMatchedIndex,
        voiceConfidence: voice.confidence,
        faceStatus: fs,
        recoveryState: rs,
        speechRhythm: rhythm,
        hasPronunciationFeedback: Boolean(
          voice.pronunciationFeedback && voice.pronunciationFeedback.status !== 'none'
        ),
        isPredicting: Boolean(voice.predictedWordIndex !== null),
      });

      setLastHoldReason((prev) => (prev !== decision.reason ? decision.reason : prev));

      if (decision.action === 'ADVANCE') {
        const nextIdx = decision.targetChunkIndex ?? idx + 1;
        if (nextIdx >= chs.length) {
          setPlaybackState('completed');
          voice.stopListening();
          if (onCompleteRef.current) {
            onCompleteRef.current();
          }
        } else {
          goToChunk(nextIdx, decision.reason);
        }
      } else if (decision.action === 'PAUSE') {
        if (decision.reason === 'COMPLETED') {
          setPlaybackState('completed');
          voice.stopListening();
          if (onCompleteRef.current) {
            onCompleteRef.current();
          }
        } else {
          pause();
        }
      } else {
        // HOLD action (Silence = Hold!)
        if (decision.reason !== 'FACE_AWAY') {
          setChunkElapsedSeconds((prev) => prev + 0.1);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [playbackState, goToChunk, pause, voice]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight' || e.code === 'ArrowDown') {
        e.preventDefault();
        nextChunk();
      } else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
        e.preventDefault();
        prevChunk();
      } else if (e.code === 'KeyM') {
        toggleMirrorMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, nextChunk, prevChunk, toggleMirrorMode]);

  return {
    chunks,
    currentChunkIndex,
    currentChunk: chunks[currentChunkIndex] || null,
    activeWordIndex,
    predictedWordIndex: voice.predictedWordIndex,
    predictedChunkIndex: voice.predictedChunkIndex,
    highlightStatus: voice.highlightStatus,
    playbackState,
    cognitiveState,
    resolvedCaptionMode,
    chunkElapsedSeconds,
    totalElapsedSeconds,
    readingTimeData,
    lastHoldReason,
    settings,
    voice,
    face,
    pronunciationFeedback: voice.pronunciationFeedback,
    skipPronunciationCorrection: voice.skipCorrection,
    clearPronunciationFeedback: voice.clearFeedback,
    play,
    pause,
    togglePlay,
    restart,
    nextChunk,
    prevChunk,
    goToChunk,
    setFontSize,
    setSpeedMultiplier,
    setMode,
    setCaptionMode,
    toggleMirrorMode,
    setFocusPosition,
    updateSettings,
  };
}
