import { useState, useEffect, useRef, useCallback } from 'react';
import { Chunk, PronunciationStrictness, PronunciationFeedback } from '@/types/teleprompter';
import { VoiceStatus, PermissionStatus } from '@/types/tracking';
import { matchTranscriptToChunks } from '@/lib/tracking/fuzzyMatch';
import { evaluatePronunciation } from '@/lib/tracking/pronunciationEngine';
import { playSubtleTone } from '@/lib/tracking/audioTone';
import { recordPronunciationAttempt } from '@/lib/tracking/pronunciationCoach';

interface UseSpeechRecognitionOptions {
  chunks: Chunk[];
  currentChunkIndex: number;
  onMatch?: (chunkIndex: number, wordIndex: number, confidence: number) => void;
  language?: string;
  pronunciationStrictness?: PronunciationStrictness;
  audioFeedbackEnabled?: boolean;
  pronunciationCoachEnabled?: boolean;
}

const DEFAULT_FEEDBACK: PronunciationFeedback = {
  status: 'none',
  targetWord: '',
  detectedWord: '',
  attemptCount: 0,
  allowSkip: false,
  similarity: 1.0,
};

export function useSpeechRecognition({
  chunks,
  currentChunkIndex,
  onMatch,
  language = 'id-ID',
  pronunciationStrictness = 'balanced',
  audioFeedbackEnabled = false,
  pronunciationCoachEnabled = true,
}: UseSpeechRecognitionOptions) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<PermissionStatus>('prompt');
  const [status, setStatus] = useState<VoiceStatus>('off');
  const [transcript, setTranscript] = useState('');
  const [lastMatchedIndex, setLastMatchedIndex] = useState<number | null>(null);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(0);
  const [confidence, setConfidence] = useState(0);
  const [pronunciationFeedback, setPronunciationFeedback] = useState<PronunciationFeedback>(DEFAULT_FEEDBACK);

  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isListeningRef = useRef(false);

  // Pronunciation attempt tracker
  const attemptCountRef = useRef<number>(0);
  const lastEvaluatedWordRef = useRef<string>('');

  // Anti-jump Hysteresis refs
  const lastCandidateIndexRef = useRef<number | null>(null);
  const candidateHitsRef = useRef<number>(0);

  const currentChunkIndexRef = useRef(currentChunkIndex);
  currentChunkIndexRef.current = currentChunkIndex;

  const chunksRef = useRef(chunks);
  chunksRef.current = chunks;

  const onMatchRef = useRef(onMatch);
  onMatchRef.current = onMatch;

  const pronunciationStrictnessRef = useRef(pronunciationStrictness);
  pronunciationStrictnessRef.current = pronunciationStrictness;

  const audioFeedbackEnabledRef = useRef(audioFeedbackEnabled);
  audioFeedbackEnabledRef.current = audioFeedbackEnabled;

  const pronunciationCoachEnabledRef = useRef(pronunciationCoachEnabled);
  pronunciationCoachEnabledRef.current = pronunciationCoachEnabled;

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

        // Pronunciation-Aware Validation:
        // Evaluates whether active word was pronounced with understandable clarity
        const currentChunk = chunksRef.current[currentChunkIndexRef.current];
        const chunkWords = currentChunk ? currentChunk.text.split(/\s+/).filter(Boolean) : [];
        const activeWord = chunkWords[result.matchedWordIndex] || '';
        const isImportantTerm = currentChunk?.importantWords?.some(
          (w) => w.toLowerCase() === activeWord.toLowerCase()
        ) ?? false;

        let isPronunciationPassed = true;

        if (activeWord) {
          const evalResult = evaluatePronunciation({
            targetWord: activeWord,
            detectedTranscript: trimmed,
            surroundingWords: chunkWords,
            speechConfidence: result.confidence,
            strictness: pronunciationStrictnessRef.current,
            isImportantTerm,
            currentAttempt: attemptCountRef.current,
          });

          if (evalResult.status === 'correct') {
            if (attemptCountRef.current > 0) {
              if (audioFeedbackEnabledRef.current) {
                playSubtleTone('correct');
              }
              setPronunciationFeedback({
                status: 'correct',
                targetWord: evalResult.targetWord,
                detectedWord: evalResult.detectedWord,
                attemptCount: 0,
                allowSkip: false,
                similarity: evalResult.similarity,
              });

              if (feedbackClearTimeoutRef.current) clearTimeout(feedbackClearTimeoutRef.current);
              feedbackClearTimeoutRef.current = setTimeout(() => {
                setPronunciationFeedback(DEFAULT_FEEDBACK);
              }, 900);
            }
            attemptCountRef.current = 0;
            if (pronunciationCoachEnabledRef.current) {
              recordPronunciationAttempt(activeWord, 'correct');
            }
          } else {
            // UNCLEAR or MISPRONOUNCED
            const isNewEvent = attemptCountRef.current === 0 || lastEvaluatedWordRef.current !== activeWord;
            attemptCountRef.current = evalResult.attemptCount;
            lastEvaluatedWordRef.current = activeWord;

            if (isNewEvent && audioFeedbackEnabledRef.current) {
              playSubtleTone('unclear');
            }
            if (pronunciationCoachEnabledRef.current) {
              recordPronunciationAttempt(activeWord, evalResult.status);
            }

            setPronunciationFeedback({
              status: evalResult.status,
              targetWord: evalResult.targetWord,
              detectedWord: evalResult.detectedWord,
              attemptCount: evalResult.attemptCount,
              allowSkip: evalResult.allowSkip,
              similarity: evalResult.similarity,
            });

            // If user hasn't chosen skip yet, HOLD teleprompter advancement
            if (!evalResult.allowSkip) {
              isPronunciationPassed = false;
            }
          }
        }

        // Advance teleprompter only if confident and pronunciation is acceptable or skipped
        if (isPronunciationPassed && result.isConfident && result.matchedIndex !== null) {
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

  const skipCorrection = useCallback(() => {
    attemptCountRef.current = 0;
    if (feedbackClearTimeoutRef.current) clearTimeout(feedbackClearTimeoutRef.current);
    setPronunciationFeedback(DEFAULT_FEEDBACK);

    // Skip to next word or chunk smoothly
    const currentChunk = chunksRef.current[currentChunkIndexRef.current];
    const words = currentChunk ? currentChunk.text.split(/\s+/).filter(Boolean) : [];
    if (activeWordIndex < words.length - 1) {
      setActiveWordIndex((prev) => prev + 1);
    } else if (currentChunkIndexRef.current < chunksRef.current.length - 1) {
      if (onMatchRef.current) {
        onMatchRef.current(currentChunkIndexRef.current + 1, 0, 1.0);
      }
    }
  }, [activeWordIndex]);

  const clearFeedback = useCallback(() => {
    attemptCountRef.current = 0;
    if (feedbackClearTimeoutRef.current) clearTimeout(feedbackClearTimeoutRef.current);
    setPronunciationFeedback(DEFAULT_FEEDBACK);
  }, []);

  return {
    isSupported,
    permission,
    status,
    transcript,
    lastMatchedIndex,
    activeWordIndex,
    confidence,
    pronunciationFeedback,
    skipCorrection,
    clearFeedback,
    startListening,
    stopListening,
    toggleListening,
  };
}
