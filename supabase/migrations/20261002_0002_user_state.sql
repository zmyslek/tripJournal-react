-- User state not represented by the initial ERD tables.
-- Country status records remain separate from trips because a country can be tracked without a trip.

create table if not exists public.country_statuses (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users (id) on delete cascade,
    country_name text not null,
    status text not null check (status in ('want-to-go', 'visited', 'want-to-visit-again')),
    added_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint country_statuses_user_country_unique unique (user_id, country_name)
);

create table if not exists public.user_preferences (
    user_id uuid primary key references public.users (id) on delete cascade,
    travel_style text not null default '',
    current_focus text not null default '',
    weekly_digest boolean not null default true,
    itinerary_reminders boolean not null default true,
    feature_announcements boolean not null default false,
    theme text not null default 'heritage' check (theme in ('heritage', 'modern-preview')),
    language text not null default 'english' check (language in ('english', 'polish')),
    map_auto_rotate boolean not null default true,
    compact_cards boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists country_statuses_user_id_idx on public.country_statuses (user_id);
create index if not exists country_statuses_user_status_idx on public.country_statuses (user_id, status);

alter table public.country_statuses enable row level security;
alter table public.user_preferences enable row level security;

create policy "Users can read their country statuses"
on public.country_statuses
for select
using (auth.uid() = user_id);

create policy "Users can create their country statuses"
on public.country_statuses
for insert
with check (auth.uid() = user_id);

create policy "Users can update their country statuses"
on public.country_statuses
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their country statuses"
on public.country_statuses
for delete
using (auth.uid() = user_id);

create policy "Users can read their preferences"
on public.user_preferences
for select
using (auth.uid() = user_id);

create policy "Users can create their preferences"
on public.user_preferences
for insert
with check (auth.uid() = user_id);

create policy "Users can update their preferences"
on public.user_preferences
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists country_statuses_set_updated_at on public.country_statuses;
create trigger country_statuses_set_updated_at
before update on public.country_statuses
for each row execute function public.set_updated_at();

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();