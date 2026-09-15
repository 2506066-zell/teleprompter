'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Chunk } from '@/types/teleprompter';
import { VoiceStatus, PermissionStatus } from '@/types/tracking';
import { matchTranscriptToChunks } from '@/lib/tracking/fuzzyMatch';

interface UseSpeechRecognitionOptions {
  chunks: Chunk[];
  currentChunkIndex: number;
  onMatch?: (chunkIndex: number, wordIndex: number, confidence: number) => void;
  language?: string;
}

export function useSpeechRecognition({
  chunks,
  currentChunkIndex,
  onMatch,
  language = 'id-ID',
}: UseSpeechRecognitionOptions) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<PermissionStatus>('prompt');
  const [status, setStatus] = useState<VoiceStatus>('off');
  const [transcript, setTranscript] = useState('');
  const [lastMatchedIndex, setLastMatchedIndex] = useState<number | null>(null);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(0);
  const [confidence, setConfidence] = useState(0);

  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isListeningRef = useRef(false);

  // Anti-jump Hysteresis refs
  const lastCandidateIndexRef = useRef<number | null>(null);
  const candidateHitsRef = useRef<number>(0);

  const currentChunkIndexRef = useRef(currentChunkIndex);
  currentChunkIndexRef.current = currentChunkIndex;

  const chunksRef = useRef(chunks);
  chunksRef.current = chunks;

  const onMatchRef = useRef(onMatch);
  onMatchRef.current = onMatch;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSupported(true);
      } else {
        setIsSupported(false);
        setStatus('unsupported');
        setPermission('unsupported');
      }
    }
  }, []);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    silenceTimeoutRef.current = setTimeout(() => {
      if (isListeningRef.current) {
        setStatus('silence');
      }
    }, 1500);
  }, []);

  const startListening = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatus('unsupported');
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        setPermission('granted');
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListeningRef.current = true;
        setStatus('listening');
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }

        const trimmed = currentTranscript.trim();
        if (!trimmed) return;

        setTranscript(trimmed);
        setStatus('speaking');
        resetSilenceTimer();

        // Anti-Jump Sliding-window match
        const result = matchTranscriptToChunks(
          trimmed,
          chunksRef.current,
          currentChunkIndexRef.current
        );

        setActiveWordIndex(result.matchedWordIndex);
        setConfidence(result.confidence);

        if (result.isConfident && result.matchedIndex !== null) {
          const targetIndex = result.matchedIndex;

          // Hysteresis verification:
          // If jumping forward to a new chunk, require either high confidence (>=0.75) or 2 hits
          if (targetIndex > currentChunkIndexRef.current) {
            if (targetIndex === lastCandidateIndexRef.current) {
              candidateHitsRef.current += 1;
            } else {
              lastCandidateIndexRef.current = targetIndex;
              candidateHitsRef.current = 1;
            }

            const shouldAdvance = result.confidence >= 0.75 || candidateHitsRef.current >= 2;

            if (shouldAdvance) {
              setLastMatchedIndex(targetIndex);
              lastCandidateIndexRef.current = null;
              candidateHitsRef.current = 0;
              if (onMatchRef.current) {
                onMatchRef.current(targetIndex, result.matchedWordIndex, result.confidence);
              }
            }
          } else {
            // Same chunk word progress
            setLastMatchedIndex(targetIndex);
            if (onMatchRef.current) {
              onMatchRef.current(targetIndex, result.matchedWordIndex, result.confidence);
            }
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setPermission('denied');
          setStatus('off');
          isListeningRef.current = false;
        }
      };

      recognition.onend = () => {
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch {
            isListeningRef.current = false;
            setStatus('off');
          }
        } else {
          setStatus('off');
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      isListeningRef.current = true;
      setStatus('listening');
      resetSilenceTimer();
    } catch {
      setPermission('denied');
      setStatus('off');
      isListeningRef.current = false;
    }
  }, [language, resetSilenceTimer]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setStatus('off');
    setTranscript('');
    lastCandidateIndexRef.current = null;
    candidateHitsRef.current = 0;
  }, []);

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  return {
    isSupported,
    permission,
    status,
    transcript,
    lastMatchedIndex,
    activeWordIndex,
    confidence,
    startListening,
    stopListening,
    toggleListening,
  };
}
