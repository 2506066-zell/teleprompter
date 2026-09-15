import { TeleprompterSettings } from "@/types/teleprompter";

export const DEFAULT_WPM = 140;
export const MIN_WPM = 80;
export const MAX_WPM = 240;

export const DEFAULT_FONT_SIZE = 36;
export const MIN_FONT_SIZE = 24;
export const MAX_FONT_SIZE = 56;

export const DEFAULT_SPEED_MULTIPLIER = 1.0;
export const MIN_SPEED_MULTIPLIER = 0.5;
export const MAX_SPEED_MULTIPLIER = 2.0;

export const FACE_AWAY_GRACE_PERIOD_MS = 1800; // 1.8s smoothing grace period before pause
export const SLIDING_WINDOW_LOOKBACK = 1;
export const SLIDING_WINDOW_LOOKAHEAD = 2;
export const MIN_VOICE_CONFIDENCE = 0.65;
export const AUTOSAVE_DEBOUNCE_MS = 1000;

export const DEFAULT_SETTINGS: TeleprompterSettings = {
  fontSize: DEFAULT_FONT_SIZE,
  speedMultiplier: DEFAULT_SPEED_MULTIPLIER,
  defaultWpm: DEFAULT_WPM,
  mode: 'adaptive',
  captionMode: 'phrase_focus', // Default to balanced Phrase Focus (Mode A)
  pronunciationStrictness: 'balanced', // 'natural' | 'balanced' | 'precise'
  audioFeedbackEnabled: false, // Optional subtle tone (default OFF)
  pronunciationCoachEnabled: true, // Local practice stats logging
  theme: 'dark',
  mirrorMode: false,
  focusPosition: 'lens_proximity', // Places active text closer to top/camera to minimize eye shift
  lineLength: 'normal',
  highlightAccent: 'soft_cyan',
};

export const SAMPLE_SCRIPTS = [
  {
    title: "Ritme Alami & Kontak Mata Lensa",
    text: `Kedua, bicaralah dengan santai dan jangan terburu-buru.

Teleprompter ini akan mengikuti kecepatan bicara Anda secara alami.

Jika Anda berhenti sejenak untuk mengambil napas,
teks akan menunggu Anda.

Terakhir, buatlah kalimat pembuka yang kuat dan relevan.

Saya menggunakan teknologi [AI] untuk meningkatkan produktivitas.`,
  },
  {
    title: "Kontak Mata & Ritme Alami Berbicara",
    text: `Halo teman-teman creator.

Saat kita berbicara di depan kamera smartphone,
rahasia terbesarnya adalah menjaga kontak mata.

Jangan biarkan mata Anda terlihat membaca teks dari kiri ke kanan.

Teleprompter ini dirancang khusus
agar teks berada sedekat mungkin dengan lensa kamera.

Bicaralah dengan tenang dan santai.

Jika Anda berhenti untuk bernapas atau berpikir sejenak,
teks akan tetap menunggu Anda di posisi yang sama.

Tidak ada teks yang bergeser tiba-tiba.

Sekarang,
rasakan bagaimana teks mengikuti ritme alami ucapan Anda.`,
  },
];
