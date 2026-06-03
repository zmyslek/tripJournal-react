---
description: TripJournal backend guidance for Vercel and Supabase work
applyTo:
  - "api/**/*.ts"
  - "supabase/**/*.sql"
  - "src/lib/supabase/**/*.ts"
---

# Backend Guidance

- Use Vercel serverless or edge functions for backend logic. Do not introduce a separate Express server.
- Use Supabase Postgres as the source of truth for persistent data.
- Keep schema changes aligned with the ERD in `src/assets/readme-assets/ERD-firstDraft.png`.
- Model the backend around these core tables: `users`, `trips`, `trip_destinations`, `trip_entries`, `photos`, `activities`, `likes`, `comments`, and `api_keys`.
- Prefer UUID primary keys, foreign keys, `timestamptz` audit fields, and row-level security on every user-owned table.
- Use Supabase Auth for sign-in and profile ownership. Create profile rows from the auth user row instead of storing passwords yourself.
- Treat API keys and other secrets as server-only data. Never hardcode provider secrets in client code.
- Keep route handlers small and explicit. Return JSON with clear status codes and error messages.
- If a schema decision is not already represented in the ERD, add a note before changing the model so frontend and backend stay aligned.
- Any new backend work should first check whether the same data is already stored locally and then define the migration path to Supabase.
