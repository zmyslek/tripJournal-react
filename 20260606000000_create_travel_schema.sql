-- 1. Create Custom Enum Types
CREATE TYPE subscription_status AS ENUM ('free', 'active', 'past_due', 'canceled');
CREATE TYPE subscription_plan AS ENUM ('free', 'monthly', 'yearly', 'lifetime', 'trial');
CREATE TYPE trip_status AS ENUM ('planned', 'ongoing', 'completed');
CREATE TYPE activity_type AS ENUM ('walking', 'hiking', 'running', 'cycling', 'flight', 'train', 'bus', 'boat', 'other');

-- 2. Create Users Table (Linked to Supabase Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    username TEXT,
    avatar_url TEXT,
    is_lifetime_free BOOL DEFAULT FALSE,
    subscription_status subscription_status DEFAULT 'free',
    subscription_tier subscription_plan DEFAULT 'free',
    trial_ends_at TIMESTAMPTZ,
    subscription_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Categories Table (Requested)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT, -- Storage for emoji or icon class names
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Trips Table
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status trip_status DEFAULT 'planned',
    start_date DATE,
    end_date DATE,
    is_public BOOL DEFAULT FALSE,
    cover_photo_url TEXT,
    spotify_playlist_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Supporting Tables
CREATE TABLE trip_destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    country_code CHAR(2) NOT NULL,
    city TEXT,
    "order" INT4 NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trip_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    entry_date DATE,
    location_label TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    entry_id UUID REFERENCES trip_entries(id) ON DELETE SET NULL,
    storage_url TEXT NOT NULL,
    caption TEXT,
    taken_at TIMESTAMPTZ,
    "order" INT4 NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    entry_id UUID REFERENCES trip_entries(id) ON DELETE SET NULL,
    type activity_type NOT NULL DEFAULT 'other',
    step_count INT4,
    distance_m FLOAT8,
    duration_s INT4,
    elevation_m FLOAT8,
    route_geojson JSONB,
    recorded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trip_id, user_id)
);

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    service TEXT NOT NULL,
    encrypted_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- 7. Define RLS Policies (User can only see their own data)
-- (Repeat this pattern for all user-owned tables)
CREATE POLICY "Users can only view their own data" ON users FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can only manage their own categories" ON categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only manage their own trips" ON trips FOR ALL USING (auth.uid() = user_id);
-- ... (and so on for all tables)

-- 8. Seed Data for zuzia.myslek@gmail.com
-- This block only runs if the user exists in auth.users
DO $$
DECLARE
    target_user_id UUID;
BEGIN
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'zuzia.myslek@gmail.com';

    IF target_user_id IS NOT NULL THEN
        -- Insert user profile
        INSERT INTO public.users (id, email, username, subscription_tier)
        VALUES (target_user_id, 'zuzia.myslek@gmail.com', 'Zuzanna', 'lifetime')
        ON CONFLICT (id) DO NOTHING;

        -- Seed default categories for Zuzia
        INSERT INTO public.categories (user_id, name, icon)
        VALUES 
            (target_user_id, 'Packing List', '🎒'),
            (target_user_id, 'Sightseeing', '🏛️'),
            (target_user_id, 'Hiking', '🥾');
    END IF;
END $$;