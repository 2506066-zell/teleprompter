'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Chunk, PlaybackState, TeleprompterMode, TeleprompterSettings, CognitiveState, FocusPosition } from '@/types/teleprompter';
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
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [lastHoldReason, setLastHoldReason] = useState<string>('');

  // Voice tracking integration
  const voice = useSpeechRecognition({
    chunks,
    currentChunkIndex,
    onMatch: (matchedIndex) => {
      if (settings.mode === 'voice_follow' || settings.mode === 'adaptive') {
        goToChunk(matchedIndex, 'VOICE_MATCH');
      }
    },
  });

  // Face tracking integration
  const face = useFaceTracking({
    enabled: settings.mode === 'adaptive' && playbackState === 'playing',
  });

  // Keep phone screen awake when teleprompter is playing
  useWakeLock(playbackState === 'playing');

  // Compute active cognitive state
  const cognitiveState = useMemo<CognitiveState>(() => {
    return deriveCognitiveState({
      mode: settings.mode,
      playbackState,
      chunks,
      currentChunkIndex,
      elapsedSeconds,
      voiceStatus: voice.status,
      voiceMatchedChunkIndex: voice.lastMatchedIndex,
      voiceConfidence: voice.confidence,
      faceStatus: face.status,
    });
  }, [
    settings.mode,
    playbackState,
    chunks,
    currentChunkIndex,
    elapsedSeconds,
    voice.status,
    voice.lastMatchedIndex,
    voice.confidence,
    face.status,
  ]);

  const stateRef = useRef({
    currentChunkIndex,
    playbackState,
    elapsedSeconds,
    settings,
    chunks,
    voiceStatus: voice.status,
    faceStatus: face.status,
  });

  stateRef.current = {
    currentChunkIndex,
    playbackState,
    elapsedSeconds,
    settings,
    chunks,
    voiceStatus: voice.status,
    faceStatus: face.status,
  };

  const onChunkChangeRef = useRef(onChunkChange);
  onChunkChangeRef.current = onChunkChange;

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const goToChunk = useCallback((index: number, reason: string = 'MANUAL') => {
    const validIndex = Math.max(0, Math.min(chunks.length - 1, index));
    setCurrentChunkIndex(validIndex);
    setElapsedSeconds(0);
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
      setElapsedSeconds(0);
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
    setElapsedSeconds(0);
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

  const toggleMirrorMode = useCallback(() => {
    setSettings((prev) => ({ ...prev, mirrorMode: !prev.mirrorMode }));
  }, []);

  const setFocusPosition = useCallback((focusPosition: FocusPosition) => {
    updateSettings({ focusPosition });
  }, [updateSettings]);

  // Tick loop
  useEffect(() => {
    if (playbackState !== 'playing') return;

    const interval = setInterval(() => {
      const {
        currentChunkIndex: idx,
        elapsedSeconds: elapsed,
        settings: s,
        chunks: chs,
        voiceStatus: vs,
        faceStatus: fs,
      } = stateRef.current;

      const currentChunk = chs[idx];
      if (!currentChunk) return;

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
      });

      setLastHoldReason(decision.reason);

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
        // HOLD action
        if (decision.reason !== 'FACE_AWAY') {
          setElapsedSeconds((prev) => prev + 0.1);
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
    playbackState,
    cognitiveState,
    elapsedSeconds,
    lastHoldReason,
    settings,
    voice,
    face,
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
    toggleMirrorMode,
    setFocusPosition,
    updateSettings,
  };
}
