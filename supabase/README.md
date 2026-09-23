# Supabase schema

The ERD tables are defined in [migrations/20260603_0001_initial_schema.sql](migrations/20260603_0001_initial_schema.sql).

## Apply it

1. Open Supabase Dashboard → SQL Editor.
2. Paste the migration SQL file contents.
3. Run it once to create the tables and RLS policies.

## Notes

- The schema matches the ERD tables: `users`, `trips`, `trip_destinations`, `trip_entries`, `photos`, `activities`, `likes`, `comments`, and `api_keys`.
- Example data is optional; the migration is safe to run empty.

## OAuth setup

Enable Google and Facebook under Supabase Dashboard -> Authentication -> Providers.
For each provider, add the provider callback URL shown in that provider's Supabase settings.

In Supabase Dashboard -> Authentication -> URL Configuration, add both app origins to
the Redirect URLs list:

- `http://localhost:5173/`
- `https://<your-vercel-domain>/`

The app uses PKCE because it uses React Router's hash routing. The redirect URL is
selected from `window.location.origin`, so local development returns to localhost and
the deployed app returns to its Vercel domain.