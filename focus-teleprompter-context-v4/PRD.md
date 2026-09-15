# Product Requirements Document v4

## 1. Vision
Focus Teleprompter adalah adaptive teleprompter mobile-first yang membuat script mengikuti ritme pengguna.

## 2. Functional requirements

### Authentication
- Sign up/sign in dengan Supabase Auth
- Session persisten
- Google OAuth bila dikonfigurasi
- User hanya dapat mengakses data sendiri

### Projects and scripts
- CRUD project
- CRUD script
- Script dapat dibuka ke editor dan teleprompter
- Debounced autosave
- Recovery draft lokal untuk mencegah kehilangan data

### Smart Chunking
Pipeline:
Raw Script → Normalize → Paragraph Detection → Sentence Detection → Natural Break Detection → Reading Chunks.

Portrait: ideal 5–12 kata, maksimum 16.
Landscape: ideal 7–16 kata, maksimum 22.

User dapat edit, split, merge, dan regenerate chunk.

### Focus Reading
Tampilkan:
- Previous context dengan opacity rendah
- Active chunk sebagai pusat visual
- Next preview sebagai konteks berikutnya

Tidak boleh terjadi layout jump atau perpindahan teks yang membingungkan.

### Auto-Pacing
Durasi chunk dihitung dari:
Base Reading Time + Punctuation Pause + Complexity Pause + Emphasis Pause.

Default baseline 140 WPM, dengan speed multiplier dan slider.

### Voice Follow
- Explicit microphone permission
- Voice activity detection
- Speech recognition bila browser mendukung
- Fuzzy matching terhadap progress window
- Silence = HOLD, bukan otomatis NEXT

### Face Tracking
Signal sekunder:
- Face presence
- Head direction
- Attention state

Gunakan smoothing dan grace period. Jangan pause karena satu frame hilang.

### Modes
- Manual
- Smart Pace
- Voice Follow
- Adaptive

### Fallback
- Speech unavailable → Smart Pace
- Camera unavailable → Voice Follow/Smart Pace
- Microphone unavailable → Smart Pace
- Semua advanced capability unavailable → Manual

## 3. Non-functional requirements
- Mobile-first
- Landscape first-class
- No horizontal scroll pada target device
- Smooth transitions
- Lazy-load fitur berat
- Privacy-first
- Production-ready Vercel deployment
