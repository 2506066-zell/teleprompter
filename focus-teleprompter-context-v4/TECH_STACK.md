# Technical Stack

## Required
- Next.js latest stable with App Router
- TypeScript strict mode
- React
- Tailwind CSS
- Supabase
- Vercel

## Supabase responsibilities
- Authentication
- PostgreSQL persistence
- Row Level Security

## Client strategy
Gunakan client/server Supabase utilities yang sesuai dengan Next.js App Router. Jangan expose service role key di browser.

## Browser capabilities
Voice dan face tracking harus progressive enhancement. Capability detection diperlukan sebelum meminta permission atau memuat dependency berat.

## Environment
Provide `.env.example` containing:
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

Document any OAuth configuration separately.
