import { TeleprompterSettings } from "@/types/teleprompter";

export const DEFAULT_WPM = 140;
export const MIN_WPM = 80;
export const MAX_WPM = 240;

export const DEFAULT_FONT_SIZE = 36;
export const MIN_FONT_SIZE = 22;
export const MAX_FONT_SIZE = 72;

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
  theme: 'dark',
  mirrorMode: false,
};

export const SAMPLE_SCRIPTS = [
  {
    title: "Tips Membuat Video Konten yang Menarik",
    text: `Halo teman-teman creator! Selamat datang di Focus Teleprompter.

Dalam video kali ini, kita akan membahas rahasia membuat konten video yang memikat penonton sejak tiga detik pertama.

Pertama, perhatikan kontak mata Anda. Jangan biarkan mata Anda terlihat membaca teks dari kiri ke kanan. Gunakan teleprompter yang berada persis di dekat lensa kamera smartphone Anda.

Kedua, bicaralah dengan santai dan jangan terburu-buru. Teleprompter ini akan mengikuti kecepatan bicara Anda secara otomatis. Jika Anda berhenti sejenak untuk mengambil napas, teks akan menunggu Anda.

Terakhir, buatlah kalimat pembuka yang kuat dan relevan dengan audiens Anda. Sekarang, silakan coba sendiri dan rasakan bedanya!`,
  },
];
