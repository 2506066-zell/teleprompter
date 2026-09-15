# Proposed Project Architecture

```text
focus-teleprompter/
├── app/
│   ├── page.tsx
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── dashboard/page.tsx
│   ├── editor/[scriptId]/page.tsx
│   ├── teleprompter/[scriptId]/page.tsx
│   └── calibration/page.tsx
├── components/
│   ├── auth/
│   ├── dashboard/
│   ├── editor/
│   ├── chunking/
│   ├── teleprompter/
│   ├── tracking/
│   └── settings/
├── hooks/
├── lib/
│   ├── supabase/
│   ├── script/
│   ├── pacing/
│   ├── tracking/
│   └── engine/
├── types/
├── constants/
├── supabase/migrations/
└── public/
```

## Rules
- UI belongs in components
- Stateful interaction belongs in hooks
- Algorithms belong in lib
- Shared domain models belong in types
- Avoid god components
- Avoid putting adaptive logic directly in page files
