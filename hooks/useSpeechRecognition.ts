'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Chunk } from '@/types/teleprompter';
import { VoiceStatus, PermissionStatus } from '@/types/tracking';
import { matchTranscriptToChunks } from '@/lib/tracking/fuzzyMatch';

interface UseSpeechRecognitionOptions {
  chunks: Chunk[];
  currentChunkIndex: number;
  onMatch?: (chunkIndex: number, confidence: number) => void;
  language?: string;
}

export function useSpeechRecognition({
  chunks,
  currentChunkIndex,
  onMatch,
  language = 'id-ID', // Default to Indonesian with English fallback capability
}: UseSpeechRecognitionOptions) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<PermissionStatus>('prompt');
  const [status, setStatus] = useState<VoiceStatus>('off');
  const [transcript, setTranscript] = useState('');
  const [lastMatchedIndex, setLastMatchedIndex] = useState<number | null>(null);
  const [confidence, setConfidence] = useState(0);

  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isListeningRef = useRef(false);

  // Keep latest refs for callbacks
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
      // Prompt for microphone permission explicitly via mediaDevices if available
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Close audio track immediately, speech recognition handles its own stream
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

        // Perform sliding-window match
        const result = matchTranscriptToChunks(
          trimmed,
          chunksRef.current,
          currentChunkIndexRef.current
        );

        if (result.matchedIndex !== null) {
          setLastMatchedIndex(result.matchedIndex);
          setConfidence(result.confidence);
          if (onMatchRef.current) {
            onMatchRef.current(result.matchedIndex, result.confidence);
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setPermission('denied');
          setStatus('off');
          isListeningRef.current = false;
        } else if (event.error !== 'no-speech') {
          // Non-fatal error, keep listening
        }
      };

      recognition.onend = () => {
        // Auto-restart if user still wants it active
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
    } catch (err) {
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
  }, []);

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  // Clean up on unmount
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
    confidence,
    startListening,
    stopListening,
    toggleListening,
  };
}
