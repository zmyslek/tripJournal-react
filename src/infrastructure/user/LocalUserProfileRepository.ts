import { DEFAULT_USER_PROFILE, type StoredUserProfile } from "../../domain/user/User.ts";

export const USER_PROFILE_CACHE_KEY = "tripjournal:user:v1";

function isSubscriptionStatus(value: unknown): value is StoredUserProfile["subscriptionStatus"] {
    return value === "inactive" || value === "trialing" || value === "active" || value === "canceled" || value === "expired" || value === "past_due";
}

function isSubscriptionTier(value: unknown): value is StoredUserProfile["subscriptionTier"] {
    return value === "free" || value === "monthly" || value === "yearly" || value === "lifetime" || value === "beta-lifetime";
}

export function getStoredUserProfile(): StoredUserProfile | null {
    try {
        const stored = localStorage.getItem(USER_PROFILE_CACHE_KEY);
        if (!stored) {
            return null;
        }

        const parsed: unknown = JSON.parse(stored);
        if (!parsed || typeof parsed !== "object") {
            return null;
        }

        const candidate = parsed as Partial<StoredUserProfile>;
        return {
            ...DEFAULT_USER_PROFILE,
            ...candidate,
            id: typeof candidate.id === "string" ? candidate.id : DEFAULT_USER_PROFILE.id,
            email: typeof candidate.email === "string" ? candidate.email : DEFAULT_USER_PROFILE.email,
            username: typeof candidate.username === "string" || candidate.username === null ? candidate.username : DEFAULT_USER_PROFILE.username,
            avatarUrl: typeof candidate.avatarUrl === "string" || candidate.avatarUrl === null ? candidate.avatarUrl : DEFAULT_USER_PROFILE.avatarUrl,
            isLifetimeFree: typeof candidate.isLifetimeFree === "boolean" ? candidate.isLifetimeFree : DEFAULT_USER_PROFILE.isLifetimeFree,
            subscriptionStatus: isSubscriptionStatus(candidate.subscriptionStatus) ? candidate.subscriptionStatus : DEFAULT_USER_PROFILE.subscriptionStatus,
            subscriptionTier: isSubscriptionTier(candidate.subscriptionTier) ? candidate.subscriptionTier : DEFAULT_USER_PROFILE.subscriptionTier,
            trialEndsAt: typeof candidate.trialEndsAt === "string" || candidate.trialEndsAt === null ? candidate.trialEndsAt : DEFAULT_USER_PROFILE.trialEndsAt,
            subscriptionEndsAt: typeof candidate.subscriptionEndsAt === "string" || candidate.subscriptionEndsAt === null ? candidate.subscriptionEndsAt : DEFAULT_USER_PROFILE.subscriptionEndsAt,
            createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : DEFAULT_USER_PROFILE.createdAt,
            authProvider: candidate.authProvider === "google" || candidate.authProvider === "facebook" ? candidate.authProvider : DEFAULT_USER_PROFILE.authProvider,
            loginTime: typeof candidate.loginTime === "string" ? candidate.loginTime : DEFAULT_USER_PROFILE.loginTime,
            travelStyle: typeof candidate.travelStyle === "string" ? candidate.travelStyle : DEFAULT_USER_PROFILE.travelStyle,
            currentFocus: typeof candidate.currentFocus === "string" ? candidate.currentFocus : DEFAULT_USER_PROFILE.currentFocus
        };
    } catch {
        return null;
    }
}

export function saveStoredUserProfile(profile: StoredUserProfile): void {
    try {
        localStorage.setItem(USER_PROFILE_CACHE_KEY, JSON.stringify(profile));
    } catch {
        // Local storage is an optional cache.
    }
}

export function clearStoredUserProfile(): void {
    try {
        localStorage.removeItem(USER_PROFILE_CACHE_KEY);
    } catch {
        // Local storage is an optional cache.
    }
}