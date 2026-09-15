/**
 * Local Pronunciation Coach & Practice Metrics Manager
 * 100% Client-side local storage.
 * Privacy-First: NEVER records or stores raw audio.
 */

import { PronunciationStats } from '@/types/teleprompter';

const STORAGE_KEY = 'focus_tp_pronunciation_coach_stats';

const DEFAULT_STATS: PronunciationStats = {
  wordsPracticed: 0,
  wordsCorrect: 0,
  wordsUnclear: 0,
  wordsCorrected: 0,
  troubledWords: [],
};

export function getPronunciationStats(): PronunciationStats {
  if (typeof window === 'undefined') return DEFAULT_STATS;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATS;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_STATS;
  }
}

export function recordPronunciationAttempt(
  targetWord: string,
  status: 'correct' | 'unclear' | 'mispronounced'
): void {
  if (typeof window === 'undefined') return;
  const cleanWord = targetWord.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '').trim();
  if (!cleanWord) return;

  try {
    const stats = getPronunciationStats();
    stats.wordsPracticed += 1;

    if (status === 'correct') {
      stats.wordsCorrect += 1;
    } else if (status === 'unclear') {
      stats.wordsUnclear += 1;
    } else if (status === 'mispronounced') {
      stats.wordsCorrected += 1;

      // Track troubled words
      const existing = stats.troubledWords.find((w) => w.word === cleanWord);
      if (existing) {
        existing.count += 1;
      } else {
        stats.troubledWords.push({ word: cleanWord, count: 1 });
      }

      // Keep only top 10 most frequently mispronounced words
      stats.troubledWords.sort((a, b) => b.count - a.count);
      if (stats.troubledWords.length > 10) {
        stats.troubledWords = stats.troubledWords.slice(0, 10);
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Ignore storage quota errors
  }
}

export function resetPronunciationStats(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
