-- Itinerary editor fields that do not map cleanly to the initial normalized trip tables.
-- This JSON is user-owned trip metadata, not public or shared content.

alter table public.trips
add column if not exists metadata jsonb not null default '{}'::jsonb;