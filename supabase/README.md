# Supabase schema

The ERD tables are defined in [migrations/20260603_0001_initial_schema.sql](migrations/20260603_0001_initial_schema.sql).

## Apply it

1. Open Supabase Dashboard → SQL Editor.
2. Paste the migration SQL file contents.
3. Run it once to create the tables and RLS policies.

## Notes

- The schema matches the ERD tables: `users`, `trips`, `trip_destinations`, `trip_entries`, `photos`, `activities`, `likes`, `comments`, and `api_keys`.
- Example data is optional; the migration is safe to run empty.