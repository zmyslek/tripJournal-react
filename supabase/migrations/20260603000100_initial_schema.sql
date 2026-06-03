-- TripJournal initial Supabase schema based on the ERD in src/assets/readme-assets/ERD-firstDraft.png.

create extension if not exists pgcrypto;

do $$
begin
    create type public.subscription_plan as enum (
        'free',
        'monthly',
        'yearly',
        'lifetime',
        'beta-lifetime'
    );
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.subscription_status as enum (
        'inactive',
        'trialing',
        'active',
        'canceled',
        'expired',
        'past_due'
    );
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.trip_status as enum (
        'draft',
        'planned',
        'active',
        'completed',
        'archived'
    );
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.activity_type as enum (
        'steps',
        'walk',
        'run',
        'hike',
        'bike',
        'other'
    );
exception
    when duplicate_object then null;
end $$;

create table if not exists public.users (
    id uuid primary key references auth.users (id) on delete cascade,
    email text not null unique,
    username text,
    avatar_url text,
    is_lifetime_free boolean not null default false,
    subscription_status public.subscription_status not null default 'inactive',
    subscription_tier public.subscription_plan not null default 'free',
    trial_ends_at timestamptz,
    subscription_ends_at timestamptz,
    created_at timestamptz not null default now()
);

create table if not exists public.trips (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users (id) on delete cascade,
    title text not null,
    status public.trip_status not null default 'draft',
    start_date date,
    end_date date,
    is_public boolean not null default false,
    cover_photo_url text,
    spotify_playlist_id text,
    created_at timestamptz not null default now()
);

create table if not exists public.trip_destinations (
    id uuid primary key default gen_random_uuid(),
    trip_id uuid not null references public.trips (id) on delete cascade,
    country_code char(2) not null,
    city text,
    "order" integer not null default 0,
    created_at timestamptz not null default now(),
    constraint trip_destinations_country_code_length check (char_length(country_code) = 2)
);

create table if not exists public.trip_entries (
    id uuid primary key default gen_random_uuid(),
    trip_id uuid not null references public.trips (id) on delete cascade,
    title text not null,
    body text not null default '',
    entry_date date,
    location_label text,
    created_at timestamptz not null default now()
);

create table if not exists public.photos (
    id uuid primary key default gen_random_uuid(),
    trip_id uuid not null references public.trips (id) on delete cascade,
    entry_id uuid references public.trip_entries (id) on delete set null,
    storage_url text not null,
    caption text,
    taken_at timestamptz,
    "order" integer not null default 0,
    created_at timestamptz not null default now()
);

create table if not exists public.activities (
    id uuid primary key default gen_random_uuid(),
    trip_id uuid not null references public.trips (id) on delete cascade,
    entry_id uuid references public.trip_entries (id) on delete set null,
    type public.activity_type not null default 'other',
    step_count integer,
    distance_m double precision,
    duration_s integer,
    elevation_m double precision,
    route_geojson jsonb,
    recorded_at timestamptz,
    created_at timestamptz not null default now()
);

create table if not exists public.likes (
    id uuid primary key default gen_random_uuid(),
    trip_id uuid not null references public.trips (id) on delete cascade,
    user_id uuid not null references public.users (id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint likes_trip_user_unique unique (trip_id, user_id)
);

create table if not exists public.comments (
    id uuid primary key default gen_random_uuid(),
    trip_id uuid not null references public.trips (id) on delete cascade,
    user_id uuid not null references public.users (id) on delete cascade,
    body text not null,
    created_at timestamptz not null default now()
);

create table if not exists public.api_keys (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users (id) on delete cascade,
    service text not null,
    encrypted_key text not null,
    created_at timestamptz not null default now(),
    constraint api_keys_user_service_unique unique (user_id, service)
);

create index if not exists trips_user_id_idx on public.trips (user_id);
create index if not exists trips_status_idx on public.trips (status);
create index if not exists trip_destinations_trip_id_order_idx on public.trip_destinations (trip_id, "order");
create index if not exists trip_entries_trip_id_entry_date_idx on public.trip_entries (trip_id, entry_date);
create index if not exists photos_trip_id_order_idx on public.photos (trip_id, "order");
create index if not exists photos_entry_id_idx on public.photos (entry_id);
create index if not exists activities_trip_id_recorded_at_idx on public.activities (trip_id, recorded_at);
create index if not exists activities_entry_id_idx on public.activities (entry_id);
create index if not exists likes_trip_id_idx on public.likes (trip_id);
create index if not exists comments_trip_id_created_at_idx on public.comments (trip_id, created_at);
create index if not exists api_keys_user_id_idx on public.api_keys (user_id);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.users (id, email)
    values (new.id, new.email)
    on conflict (id) do update
    set email = excluded.email;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.is_trip_owner(trip_uuid uuid)
returns boolean
language sql
stable
as $$
    select exists (
        select 1
        from public.trips
        where id = trip_uuid
          and user_id = auth.uid()
    );
$$;

create or replace function public.can_view_trip(trip_uuid uuid)
returns boolean
language sql
stable
as $$
    select exists (
        select 1
        from public.trips
        where id = trip_uuid
          and (user_id = auth.uid() or is_public)
    );
$$;

alter table public.users enable row level security;
alter table public.trips enable row level security;
alter table public.trip_destinations enable row level security;
alter table public.trip_entries enable row level security;
alter table public.photos enable row level security;
alter table public.activities enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.api_keys enable row level security;

create policy "Users can read their profile"
on public.users
for select
using (auth.uid() = id);

create policy "Users can insert their profile"
on public.users
for insert
with check (auth.uid() = id);

create policy "Users can update their profile"
on public.users
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Trips are visible to owners and public trips"
on public.trips
for select
using (user_id = auth.uid() or is_public);

create policy "Trip owners can create trips"
on public.trips
for insert
with check (user_id = auth.uid());

create policy "Trip owners can update trips"
on public.trips
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Trip owners can delete trips"
on public.trips
for delete
using (user_id = auth.uid());

create policy "Trip destinations inherit trip visibility"
on public.trip_destinations
for select
using (public.can_view_trip(trip_id));

create policy "Trip owners can manage destinations"
on public.trip_destinations
for all
using (public.is_trip_owner(trip_id))
with check (public.is_trip_owner(trip_id));

create policy "Trip entries inherit trip visibility"
on public.trip_entries
for select
using (public.can_view_trip(trip_id));

create policy "Trip owners can manage entries"
on public.trip_entries
for all
using (public.is_trip_owner(trip_id))
with check (public.is_trip_owner(trip_id));

create policy "Photos inherit trip visibility"
on public.photos
for select
using (public.can_view_trip(trip_id));

create policy "Trip owners can manage photos"
on public.photos
for all
using (public.is_trip_owner(trip_id))
with check (public.is_trip_owner(trip_id));

create policy "Activities inherit trip visibility"
on public.activities
for select
using (public.can_view_trip(trip_id));

create policy "Trip owners can manage activities"
on public.activities
for all
using (public.is_trip_owner(trip_id))
with check (public.is_trip_owner(trip_id));

create policy "Likes inherit trip visibility"
on public.likes
for select
using (public.can_view_trip(trip_id));

create policy "Users can add likes to trips they can view"
on public.likes
for insert
with check (user_id = auth.uid() and public.can_view_trip(trip_id));

create policy "Users can remove their likes"
on public.likes
for delete
using (user_id = auth.uid());

create policy "Comments inherit trip visibility"
on public.comments
for select
using (public.can_view_trip(trip_id));

create policy "Users can add comments to trips they can view"
on public.comments
for insert
with check (user_id = auth.uid() and public.can_view_trip(trip_id));

create policy "Users can edit their comments"
on public.comments
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete their comments"
on public.comments
for delete
using (user_id = auth.uid());

create policy "Users can manage their API keys"
on public.api_keys
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
