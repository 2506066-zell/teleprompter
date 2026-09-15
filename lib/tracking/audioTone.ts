/**
 * Lightweight Web Audio API subtle feedback generator.
 * Zero external audio assets, zero distortion, low distraction.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Plays a short, soft, non-intrusive auditory feedback tone.
 *
 * - 'unclear': 80ms warm descending sine (420Hz -> 360Hz), volume -24dB
 * - 'correct': 90ms gentle ascending chime (520Hz -> 660Hz), volume -26dB
 */
export function playSubtleTone(type: 'unclear' | 'correct'): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;

    if (type === 'unclear') {
      // Warm, subtle low ping (not an annoying buzzer or alarm)
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(360, now + 0.08);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.085);
    } else {
      // Gentle subtle confirmation chime
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.09);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.03, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.095);
    }
  } catch {
    // Ignore audio context autoplay errors silently
  }
}
