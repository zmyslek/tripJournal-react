import { supabase } from "./client";

export type CountryVisitStatus = "want-to-go" | "visited" | "want-to-visit-again";
export type JournalTheme = "heritage" | "modern-preview";
export type JournalLanguage = "english" | "polish";
export type GalleryMediaKind = "image" | "video";

export interface JournalProfile {
    id: string;
    email: string;
    username: string | null;
    avatarUrl: string | null;
    isLifetimeFree: boolean;
    subscriptionStatus: "inactive" | "trialing" | "active" | "canceled" | "expired" | "past_due";
    subscriptionTier: "free" | "monthly" | "yearly" | "lifetime" | "beta-lifetime";
    trialEndsAt: string | null;
    subscriptionEndsAt: string | null;
    createdAt: string;
}

export interface UserPreferences {
    firstName: string | null;
    lastName: string | null;
    travelStyle: string | null;
    currentFocus: string | null;
    secondaryEmail: string | null;
    weeklyDigest: boolean;
    itineraryReminders: boolean;
    featureAnnouncements: boolean;
    paymentAlerts: boolean;
    theme: JournalTheme;
    language: JournalLanguage;
    mapAutoRotate: boolean;
    compactCards: boolean;
}

interface UserRow {
    id: string;
    email: string;
    username: string | null;
    avatar_url: string | null;
    is_lifetime_free: boolean;
    subscription_status: "inactive" | "trialing" | "active" | "canceled" | "expired" | "past_due";
    subscription_tier: "free" | "monthly" | "yearly" | "lifetime" | "beta-lifetime";
    trial_ends_at: string | null;
    subscription_ends_at: string | null;
    created_at: string;
}

interface UserPreferencesRow {
    first_name: string | null;
    last_name: string | null;
    travel_style: string | null;
    current_focus: string | null;
    secondary_email: string | null;
    weekly_digest: boolean;
    itinerary_reminders: boolean;
    feature_announcements: boolean;
    payment_alerts: boolean;
    theme: JournalTheme;
    language: JournalLanguage;
    map_auto_rotate: boolean;
    compact_cards: boolean;
}

export interface CountryStatusRow {
    country_name: string;
    status: CountryVisitStatus;
    added_at: string;
}

export interface GalleryRow {
    id: string;
    storage_path: string;
    storage_url: string;
    location_label: string | null;
    caption: string | null;
    media_kind: GalleryMediaKind;
    created_at: string;
}

export interface GalleryItem {
    id: string;
    kind: GalleryMediaKind;
    src: string;
    text: string;
    name: string;
    fullPath: string;
    label: string;
    locationLabel: string | null;
}

const GALLERY_BUCKET = "USER-CONTENT";

async function getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
        throw error;
    }

    if (!data.user) {
        throw new Error("Not authenticated");
    }

    return data.user;
}

function getFallbackUsername(email: string): string | null {
    const trimmed = email.trim();
    if (!trimmed) {
        return null;
    }

    const [localPart] = trimmed.split("@");
    return localPart || null;
}

export async function loadJournalProfile() {
    const user = await getCurrentUser();

    const [{ data: profileRow, error: profileError }, { data: preferencesRow, error: preferencesError }] = await Promise.all([
        supabase
            .from("users")
            .select("id,email,username,avatar_url,is_lifetime_free,subscription_status,subscription_tier,trial_ends_at,subscription_ends_at,created_at")
            .eq("id", user.id)
            .maybeSingle<UserRow>(),
        supabase
            .from("user_preferences")
            .select("first_name,last_name,travel_style,current_focus,secondary_email,weekly_digest,itinerary_reminders,feature_announcements,payment_alerts,theme,language,map_auto_rotate,compact_cards")
            .eq("user_id", user.id)
            .maybeSingle<UserPreferencesRow>()
    ]);

    if (profileError) {
        throw profileError;
    }

    if (preferencesError) {
        throw preferencesError;
    }

    if (!profileRow) {
        throw new Error("Unable to load profile.");
    }

    return {
        user,
        profile: {
            id: profileRow.id,
            email: profileRow.email,
            username: profileRow.username,
            avatarUrl: profileRow.avatar_url,
            isLifetimeFree: profileRow.is_lifetime_free,
            subscriptionStatus: profileRow.subscription_status,
            subscriptionTier: profileRow.subscription_tier,
            trialEndsAt: profileRow.trial_ends_at,
            subscriptionEndsAt: profileRow.subscription_ends_at,
            createdAt: profileRow.created_at
        } satisfies JournalProfile,
        preferences: preferencesRow
            ? {
                firstName: preferencesRow.first_name,
                lastName: preferencesRow.last_name,
                travelStyle: preferencesRow.travel_style,
                currentFocus: preferencesRow.current_focus,
                secondaryEmail: preferencesRow.secondary_email,
                weeklyDigest: preferencesRow.weekly_digest,
                itineraryReminders: preferencesRow.itinerary_reminders,
                featureAnnouncements: preferencesRow.feature_announcements,
                paymentAlerts: preferencesRow.payment_alerts,
                theme: preferencesRow.theme,
                language: preferencesRow.language,
                mapAutoRotate: preferencesRow.map_auto_rotate,
                compactCards: preferencesRow.compact_cards
            } satisfies UserPreferences
            : null
    };
}

export async function upsertJournalProfile(update: {
    username?: string | null;
    avatarUrl?: string | null;
}) {
    const user = await getCurrentUser();

    const payload: Record<string, string | null> = {};
    if (update.username !== undefined) {
        payload.username = update.username?.trim() || null;
    }

    if (update.avatarUrl !== undefined) {
        payload.avatar_url = update.avatarUrl?.trim() || null;
    }

    const { data, error } = await supabase
        .from("users")
        .update(payload)
        .eq("id", user.id)
        .select("id,email,username,avatar_url,is_lifetime_free,subscription_status,subscription_tier,trial_ends_at,subscription_ends_at,created_at")
        .maybeSingle<UserRow>();

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error("Unable to save profile.");
    }

    return {
        id: data.id,
        email: data.email,
        username: data.username,
        avatarUrl: data.avatar_url,
        isLifetimeFree: data.is_lifetime_free,
        subscriptionStatus: data.subscription_status,
        subscriptionTier: data.subscription_tier,
        trialEndsAt: data.trial_ends_at,
        subscriptionEndsAt: data.subscription_ends_at,
        createdAt: data.created_at
    } satisfies JournalProfile;
}

export async function loadUserPreferences() {
    const user = await getCurrentUser();

    const { data, error } = await supabase
        .from("user_preferences")
        .select("first_name,last_name,travel_style,current_focus,secondary_email,weekly_digest,itinerary_reminders,feature_announcements,payment_alerts,theme,language,map_auto_rotate,compact_cards")
        .eq("user_id", user.id)
        .maybeSingle<UserPreferencesRow>();

    if (error) {
        throw error;
    }

    if (!data) {
        return null;
    }

    return {
        firstName: data.first_name,
        lastName: data.last_name,
        travelStyle: data.travel_style,
        currentFocus: data.current_focus,
        secondaryEmail: data.secondary_email,
        weeklyDigest: data.weekly_digest,
        itineraryReminders: data.itinerary_reminders,
        featureAnnouncements: data.feature_announcements,
        paymentAlerts: data.payment_alerts,
        theme: data.theme,
        language: data.language,
        mapAutoRotate: data.map_auto_rotate,
        compactCards: data.compact_cards
    } satisfies UserPreferences;
}

export async function saveUserPreferences(preferences: UserPreferences) {
    const user = await getCurrentUser();

    const { data, error } = await supabase
        .from("user_preferences")
        .upsert({
            user_id: user.id,
            first_name: preferences.firstName?.trim() || null,
            last_name: preferences.lastName?.trim() || null,
            travel_style: preferences.travelStyle?.trim() || null,
            current_focus: preferences.currentFocus?.trim() || null,
            secondary_email: preferences.secondaryEmail?.trim() || null,
            weekly_digest: preferences.weeklyDigest,
            itinerary_reminders: preferences.itineraryReminders,
            feature_announcements: preferences.featureAnnouncements,
            payment_alerts: preferences.paymentAlerts,
            theme: preferences.theme,
            language: preferences.language,
            map_auto_rotate: preferences.mapAutoRotate,
            compact_cards: preferences.compactCards,
            updated_at: new Date().toISOString()
        }, { onConflict: "user_id" })
        .select("first_name,last_name,travel_style,current_focus,secondary_email,weekly_digest,itinerary_reminders,feature_announcements,payment_alerts,theme,language,map_auto_rotate,compact_cards")
        .maybeSingle<UserPreferencesRow>();

    if (error) {
        throw error;
    }

    if (!data) {
        return null;
    }

    return {
        firstName: data.first_name,
        lastName: data.last_name,
        travelStyle: data.travel_style,
        currentFocus: data.current_focus,
        secondaryEmail: data.secondary_email,
        weeklyDigest: data.weekly_digest,
        itineraryReminders: data.itinerary_reminders,
        featureAnnouncements: data.feature_announcements,
        paymentAlerts: data.payment_alerts,
        theme: data.theme,
        language: data.language,
        mapAutoRotate: data.map_auto_rotate,
        compactCards: data.compact_cards
    } satisfies UserPreferences;
}

export async function loadCountryStatuses() {
    const user = await getCurrentUser();

    const { data, error } = await supabase
        .from("country_statuses")
        .select("country_name,status,added_at")
        .eq("user_id", user.id)
        .returns<CountryStatusRow[]>();

    if (error) {
        throw error;
    }

    return data ?? [];
}

export async function setCountryStatus(countryName: string, status: CountryVisitStatus | null, previousAddedAt?: string | null) {
    const user = await getCurrentUser();

    if (!status) {
        const { error } = await supabase
            .from("country_statuses")
            .delete()
            .eq("user_id", user.id)
            .eq("country_name", countryName);

        if (error) {
            throw error;
        }

        return null;
    }

    const addedAt = previousAddedAt ?? new Date().toISOString();
    const { error } = await supabase
        .from("country_statuses")
        .upsert({
            user_id: user.id,
            country_name: countryName,
            status,
            added_at: addedAt,
            updated_at: new Date().toISOString()
        }, { onConflict: "user_id,country_name" });

    if (error) {
        throw error;
    }

    return addedAt;
}

export async function loadGalleryItems() {
    const user = await getCurrentUser();

    const { data, error } = await supabase
        .from("gallery_items")
        .select("id,storage_path,storage_url,location_label,caption,media_kind,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .returns<GalleryRow[]>();

    if (error) {
        throw error;
    }

    return data ?? [];
}

export async function uploadGalleryFiles(files: FileList, locationLabel: string) {
    const user = await getCurrentUser();
    const rows: GalleryRow[] = [];

    for (const file of Array.from(files)) {
        const filePath = `${user.id}/${locationLabel}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from(GALLERY_BUCKET).upload(filePath, file, {
            cacheControl: "3600",
            upsert: false
        });

        if (uploadError) {
            throw uploadError;
        }

        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from(GALLERY_BUCKET)
            .createSignedUrl(filePath, 3600);

        if (signedUrlError || !signedUrlData?.signedUrl) {
            throw signedUrlError ?? new Error("Unable to create gallery URL.");
        }

        const inserted = {
            user_id: user.id,
            storage_path: filePath,
            storage_url: signedUrlData.signedUrl,
            location_label: locationLabel,
            caption: file.name,
            media_kind: file.type.startsWith("video/") ? "video" : "image",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data: row, error: insertError } = await supabase
            .from("gallery_items")
            .upsert(inserted, { onConflict: "storage_path" })
            .select("id,storage_path,storage_url,location_label,caption,media_kind,created_at")
            .maybeSingle<GalleryRow>();

        if (insertError || !row) {
            throw insertError ?? new Error("Unable to save gallery record.");
        }

        rows.push(row);
    }

    return rows;
}

export async function deleteGalleryItem(storagePath: string) {
    const user = await getCurrentUser();

    const [{ error: storageError }, { error: rowError }] = await Promise.all([
        supabase.storage.from(GALLERY_BUCKET).remove([storagePath]),
        supabase.from("gallery_items").delete().eq("user_id", user.id).eq("storage_path", storagePath)
    ]);

    if (storageError) {
        throw storageError;
    }

    if (rowError) {
        throw rowError;
    }
}

export function mapProfileToDisplayName(profile: JournalProfile, preferences: UserPreferences | null): string {
    const fromPreferences = `${preferences?.firstName ?? ""} ${preferences?.lastName ?? ""}`.trim();
    if (fromPreferences) {
        return fromPreferences;
    }

    return profile.username?.trim() || getFallbackUsername(profile.email) || "Traveler";
}
