-- Supabase tables that back the user-facing journal UI.

do $$
begin
    create type public.country_visit_status as enum (
        'want-to-go',
        'visited',
        'want-to-visit-again'
    );
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.journal_theme as enum (
        'heritage',
        'modern-preview'
    );
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.journal_language as enum (
        'english',
        'polish'
    );
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.gallery_media_kind as enum (
        'image',
        'video'
    );
exception
    when duplicate_object then null;
end $$;

create table if not exists public.user_preferences (
    user_id uuid primary key references public.users (id) on delete cascade,
    first_name text,
    last_name text,
    travel_style text,
    current_focus text,
    secondary_email text,
    weekly_digest boolean not null default true,
    itinerary_reminders boolean not null default true,
    feature_announcements boolean not null default false,
    payment_alerts boolean not null default true,
    theme public.journal_theme not null default 'heritage',
    language public.journal_language not null default 'english',
    map_auto_rotate boolean not null default true,
    compact_cards boolean not null default false,
    updated_at timestamptz not null default now()
);

create table if not exists public.country_statuses (
    user_id uuid not null references public.users (id) on delete cascade,
    country_name text not null,
    status public.country_visit_status not null,
    added_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (user_id, country_name)
);

create table if not exists public.gallery_items (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users (id) on delete cascade,
    storage_path text not null unique,
    storage_url text not null,
    location_label text,
    caption text,
    media_kind public.gallery_media_kind not null default 'image',
    taken_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists country_statuses_user_id_idx on public.country_statuses (user_id);
create index if not exists country_statuses_status_idx on public.country_statuses (status);
create index if not exists gallery_items_user_id_created_at_idx on public.gallery_items (user_id, created_at desc);
create index if not exists gallery_items_location_label_idx on public.gallery_items (location_label);

alter table public.user_preferences enable row level security;
alter table public.country_statuses enable row level security;
alter table public.gallery_items enable row level security;

create policy "Users can read their preferences"
on public.user_preferences
for select
using (auth.uid() = user_id);

create policy "Users can insert their preferences"
on public.user_preferences
for insert
with check (auth.uid() = user_id);

create policy "Users can update their preferences"
on public.user_preferences
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can read their country statuses"
on public.country_statuses
for select
using (auth.uid() = user_id);

create policy "Users can manage their country statuses"
on public.country_statuses
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can read their gallery items"
on public.gallery_items
for select
using (auth.uid() = user_id);

create policy "Users can manage their gallery items"
on public.gallery_items
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.handle_new_user_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.user_preferences (user_id, first_name, last_name)
    values (
        new.id,
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        null
    )
    on conflict (user_id) do nothing;

    return new;
end;
$$;

drop trigger if exists on_public_user_created_preferences on public.users;
create trigger on_public_user_created_preferences
after insert on public.users
for each row execute function public.handle_new_user_preferences();
