# Focus Teleprompter — Context Package v4

Package ini adalah **context source of truth** untuk Antigravity/Coding Agent. Ini bukan starter code dan bukan project yang sudah diimplementasikan.

Tujuan package ini: memberi agent konteks lengkap agar agent dapat membangun aplikasi dari nol dengan arsitektur yang konsisten.

## Cara pakai
1. Extract ZIP ini ke workspace project baru.
2. Buka workspace di Antigravity.
3. Minta agent membaca seluruh file Markdown terlebih dahulu, terutama `AGENT_INSTRUCTIONS.md`.
4. Agent kemudian membuat aplikasi dari nol berdasarkan dokumen ini.

Urutan dokumen yang direkomendasikan:
`AGENT_INSTRUCTIONS.md` → `PROJECT_CONTEXT.md` → `PRD.md` → dokumen teknis lainnya.

## Stack target
- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase Auth + PostgreSQL + RLS
- Vercel deployment
- Browser-native speech/media APIs dan progressive enhancement
