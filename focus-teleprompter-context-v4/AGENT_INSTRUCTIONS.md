# Antigravity / Coding Agent Instructions

## FIRST ACTION
Before writing code, read every Markdown file in this Context Package. Treat these documents as the source of truth.

## Your role
Act as a senior full-stack engineer, mobile UX specialist, speech interaction engineer, and performance-focused architect.

## Mission
Build Focus Teleprompter from scratch. This package intentionally contains no implementation to preserve architectural freedom. Do not replace requirements with mockups or fake functionality.

## Mandatory workflow
1. Read all context files.
2. Inspect the current repository.
3. Produce/maintain a short implementation plan.
4. Initialize the required Next.js architecture if absent.
5. Implement Supabase integration and migrations early.
6. Implement Auth and verify protected data ownership.
7. Build script/project CRUD.
8. Build teleprompter core.
9. Implement Smart Chunking.
10. Implement Auto-Pacing.
11. Add Voice Tracking progressively.
12. Add Face Tracking progressively and lazy-load it.
13. Implement Adaptive Decision Engine.
14. Polish mobile and landscape.
15. Test build, permission states, fallbacks, and RLS.

## Non-negotiable rules
- Do not create fake buttons.
- Do not claim AI functionality without real behavior.
- Do not use a generic SaaS template.
- Do not overengineer a custom backend when Supabase is sufficient.
- Do not expose secrets.
- Do not trust client-side ownership checks.
- Manual controls always override automatic systems.
- Voice is primary adaptive signal; face is secondary.
- Silence means HOLD, not NEXT.
- Low-confidence speech matching must not jump randomly.
- Advanced tracking must gracefully fall back.

## Definition of done
The application is done only when:
- Auth works
- RLS is tested conceptually and implemented correctly
- Project/script CRUD works
- Autosave works
- Smart Chunking works
- Manual teleprompter works
- Auto-Pacing works
- Mobile and landscape work
- Voice/face permission failures degrade gracefully
- Production build succeeds
- Vercel deployment requirements are documented

## Design mandate
The script is the hero. Typography and focus are more important than decorative UI.

Build deliberately. Prefer deterministic, explainable behavior before adding complexity that merely looks intelligent.
