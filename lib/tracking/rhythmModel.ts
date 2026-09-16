import { SpeechRhythmState } from '@/types/teleprompter';

interface WordTimestamp {
  word: string;
  time: number; // performance.now()
  confidence: number;
}

/**
 * Speech Rhythm Model:
 * Lightweight real-time estimator tracking a rolling window of recent speech.
 * Computes instantaneous WPM, exponential smoothed WPM, acceleration,
 * pause probabilities, and reading stability metrics.
 */
export class SpeechRhythmModel {
  private window: WordTimestamp[] = [];
  private maxWindowSize: number = 15;
  private minWindowSize: number = 4;
  private smoothedWPM: number = 140; // Default baseline
  private lastPauseStart: number | null = null;
  private defaultWPM: number = 140;

  constructor(defaultWpm: number = 140) {
    this.defaultWPM = defaultWpm;
    this.smoothedWPM = defaultWpm;
  }

  /**
   * Records a confirmed or highly-confident recognized word.
   */
  public recordWord(word: string, confidence: number = 0.85, timestamp?: number): void {
    const now = timestamp !== undefined ? timestamp : (typeof performance !== 'undefined' ? performance.now() : Date.now());
    this.lastPauseStart = null;

    this.window.push({ word, time: now, confidence });
    if (this.window.length > this.maxWindowSize) {
      this.window.shift();
    }

    // Update smoothed WPM upon new word
    this.computeCurrentMetrics();
  }

  /**
   * Informs the model that silence has begun at this timestamp.
   */
  public recordSilence(now: number = typeof performance !== 'undefined' ? performance.now() : Date.now()): void {
    if (this.lastPauseStart === null) {
      this.lastPauseStart = now;
    }
  }

  /**
   * Computes the current rhythm metrics state.
   */
  public computeCurrentMetrics(): SpeechRhythmState {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    if (this.window.length < 2) {
      return {
        currentWPM: this.defaultWPM,
        rollingWPM: this.defaultWPM,
        smoothedWPM: this.smoothedWPM,
        speechAcceleration: 0,
        pauseProbability: this.lastPauseStart ? 0.8 : 0.05,
        readingStability: 1.0,
        wordIntervalMs: 60000 / this.defaultWPM,
      };
    }

    // 1. Calculate intervals between adjacent words
    const intervals: number[] = [];
    for (let i = 1; i < this.window.length; i++) {
      const dt = this.window[i].time - this.window[i - 1].time;
      if (dt > 50 && dt < 4000) { // filter outliers (50ms to 4s)
        intervals.push(dt);
      }
    }

    if (intervals.length === 0) {
      return {
        currentWPM: this.defaultWPM,
        rollingWPM: this.defaultWPM,
        smoothedWPM: this.smoothedWPM,
        speechAcceleration: 0,
        pauseProbability: 0.1,
        readingStability: 1.0,
        wordIntervalMs: 60000 / this.defaultWPM,
      };
    }

    // 2. Average interval of recent 3 words (Instantaneous WPM)
    const recentIntervals = intervals.slice(-3);
    const avgRecentInterval =
      recentIntervals.reduce((sum, v) => sum + v, 0) / recentIntervals.length;
    const instantWPM = Math.max(50, Math.min(280, Math.round(60000 / avgRecentInterval)));

    // 3. Rolling window WPM (over full window of 5-15 words)
    const totalDuration = this.window[this.window.length - 1].time - this.window[0].time;
    const windowMinutes = totalDuration / 60000;
    const rawRollingWPM = windowMinutes > 0 ? (this.window.length - 1) / windowMinutes : this.defaultWPM;
    const rollingWPM = Math.max(50, Math.min(280, Math.round(rawRollingWPM)));

    // 4. Exponential Smoothing Filter:
    // smoothedWPM = previousWPM * 0.8 + currentEstimate * 0.2
    this.smoothedWPM = Number((this.smoothedWPM * 0.8 + rollingWPM * 0.2).toFixed(1));

    // 5. Speech Acceleration (comparing recent half vs older half of window)
    let speechAcceleration = 0;
    if (intervals.length >= 4) {
      const mid = Math.floor(intervals.length / 2);
      const olderAvg = intervals.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
      const newerAvg = intervals.slice(mid).reduce((a, b) => a + b, 0) / (intervals.length - mid);
      // If newerAvg < olderAvg, speaker is speeding up (positive acceleration)
      const diffMs = olderAvg - newerAvg;
      speechAcceleration = Number((diffMs / 100).toFixed(2)); // scaled
    }

    // 6. Pause Probability:
    // How long since the last word?
    const elapsedSinceLastWord = now - this.window[this.window.length - 1].time;
    let pauseProbability = 0;
    if (elapsedSinceLastWord > 700) {
      pauseProbability = Math.min(1.0, (elapsedSinceLastWord - 700) / 1200);
    }

    // 7. Reading Stability (Variance of intervals: lower variance = higher stability)
    const meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance =
      intervals.reduce((acc, val) => acc + Math.pow(val - meanInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    // Stability 1.0 (perfect metronome) down to 0.2 (staccato / irregular)
    const readingStability = Math.max(0.2, Number((1 - Math.min(1, stdDev / 400)).toFixed(2)));

    return {
      currentWPM: instantWPM,
      rollingWPM,
      smoothedWPM: this.smoothedWPM,
      speechAcceleration,
      pauseProbability,
      readingStability,
      wordIntervalMs: Math.round(avgRecentInterval),
    };
  }

  /**
   * Resets the rhythm model upon teleprompter restart.
   */
  public reset(defaultWpm: number = 140): void {
    this.window = [];
    this.defaultWPM = defaultWpm;
    this.smoothedWPM = defaultWpm;
    this.lastPauseStart = null;
  }
}
