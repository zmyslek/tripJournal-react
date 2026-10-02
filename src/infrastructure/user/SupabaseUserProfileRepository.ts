import { supabase } from "../../lib/supabase/client";
import type { AuthProvider } from "../../domain/user/User";

export interface CloudUserProfile {
    id: string;
    email: string;
    username: string | null;
    avatarUrl: string | null;
    createdAt: string;
    authProvider: AuthProvider;
    travelStyle: string;
    currentFocus: string;
}

export interface CloudUserStats {
    visited: number;
    wishlist: number;
    returns: number;
    trips: number;
}

export interface CloudUserPreferences {
    weeklyDigest: boolean;
    itineraryReminders: boolean;
    featureAnnouncements: boolean;
    theme: "heritage" | "modern-preview";
    language: "english" | "polish";
    mapAutoRotate: boolean;
    compactCards: boolean;
}

interface UserRow {
    id: string;
    email: string;
    username: string | null;
    avatar_url: string | null;
    created_at: string;
}

interface PreferencesRow {
    travel_style: string;
    current_focus: string;
    weekly_digest?: boolean;
    itinerary_reminders?: boolean;
    feature_announcements?: boolean;
    theme?: "heritage" | "modern-preview";
    language?: "english" | "polish";
    map_auto_rotate?: boolean;
    compact_cards?: boolean;
}

function mapProvider(provider: string | undefined): AuthProvider {
    return provider === "google" || provider === "facebook" ? provider : "email";
}

export async function loadCloudUserProfile(): Promise<CloudUserProfile | null> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
        throw authError;
    }

    const authUser = authData.user;
    if (!authUser) {
        return null;
    }

    const [{ data: userRow, error: userError }, { data: preferences, error: preferencesError }] = await Promise.all([
        supabase.from("users").select("id, email, username, avatar_url, created_at").eq("id", authUser.id).maybeSingle(),
        supabase.from("user_preferences").select("travel_style, current_focus").eq("user_id", authUser.id).maybeSingle()
    ]);

    if (userError) {
        throw userError;
    }
    if (preferencesError) {
        throw preferencesError;
    }

    const row = userRow as UserRow | null;
    return {
        id: authUser.id,
        email: row?.email ?? authUser.email ?? "",
        username: row?.username ?? authUser.user_metadata?.username ?? authUser.user_metadata?.name ?? null,
        avatarUrl: row?.avatar_url ?? authUser.user_metadata?.avatar_url ?? null,
        createdAt: row?.created_at ?? authUser.created_at,
        authProvider: mapProvider(authUser.app_metadata?.provider),
        travelStyle: (preferences as PreferencesRow | null)?.travel_style ?? "",
        currentFocus: (preferences as PreferencesRow | null)?.current_focus ?? ""
    };
}

export async function saveCloudUserProfile(profile: CloudUserProfile): Promise<void> {
    const { error: userError } = await supabase
        .from("users")
        .update({
            username: profile.username,
            avatar_url: profile.avatarUrl
        })
        .eq("id", profile.id);

    if (userError) {
        throw userError;
    }

    const { error: preferencesError } = await supabase
        .from("user_preferences")
        .upsert({
            user_id: profile.id,
            travel_style: profile.travelStyle,
            current_focus: profile.currentFocus
        }, { onConflict: "user_id" });

    if (preferencesError) {
        throw preferencesError;
    }
}

export async function loadCloudUserStats(): Promise<CloudUserStats | null> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
        throw authError;
    }

    const user = authData.user;
    if (!user) {
        return null;
    }

    const [visited, wishlist, returns, trips] = await Promise.all([
        supabase.from("country_statuses").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "visited"),
        supabase.from("country_statuses").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "want-to-go"),
        supabase.from("country_statuses").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "want-to-visit-again"),
        supabase.from("trips").select("id", { count: "exact", head: true }).eq("user_id", user.id)
    ]);

    const result = [visited, wishlist, returns, trips].find(query => query.error);
    if (result?.error) {
        throw result.error;
    }

    return {
        visited: visited.count ?? 0,
        wishlist: wishlist.count ?? 0,
        returns: returns.count ?? 0,
        trips: trips.count ?? 0
    };
}

export async function loadCloudUserPreferences(): Promise<{ userId: string; preferences: CloudUserPreferences } | null> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
        throw authError;
    }

    const user = authData.user;
    if (!user) {
        return null;
    }

    const { data, error } = await supabase
        .from("user_preferences")
        .select("weekly_digest, itinerary_reminders, feature_announcements, theme, language, map_auto_rotate, compact_cards")
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) {
        throw error;
    }

    const row = data as PreferencesRow | null;
    return {
        userId: user.id,
        preferences: {
            weeklyDigest: row?.weekly_digest ?? true,
            itineraryReminders: row?.itinerary_reminders ?? true,
            featureAnnouncements: row?.feature_announcements ?? false,
            theme: row?.theme === "modern-preview" ? "modern-preview" : "heritage",
            language: row?.language === "polish" ? "polish" : "english",
            mapAutoRotate: row?.map_auto_rotate ?? true,
            compactCards: row?.compact_cards ?? false
        }
    };
}

export async function saveCloudUserSettings(
    userId: string,
    settings: { username: string; notifications: CloudUserPreferences }
): Promise<void> {
    const { error: userError } = await supabase
        .from("users")
        .update({ username: settings.username })
        .eq("id", userId);

    if (userError) {
        throw userError;
    }

    const { error: preferencesError } = await supabase
        .from("user_preferences")
        .upsert({
            user_id: userId,
            weekly_digest: settings.notifications.weeklyDigest,
            itinerary_reminders: settings.notifications.itineraryReminders,
            feature_announcements: settings.notifications.featureAnnouncements,
            theme: settings.notifications.theme,
            language: settings.notifications.language,
            map_auto_rotate: settings.notifications.mapAutoRotate,
            compact_cards: settings.notifications.compactCards
        }, { onConflict: "user_id" });

    if (preferencesError) {
        throw preferencesError;
    }
}