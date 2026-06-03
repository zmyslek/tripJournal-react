export type AuthProvider = "email" | "google" | "facebook";
export type UserSubscriptionPlan = "free" | "monthly" | "yearly" | "lifetime" | "beta-lifetime";

export type SubscriptionStatus = "inactive" | "trialing" | "active" | "canceled" | "expired" | "past_due";

export interface StoredUserProfile {
    id: string;
    email: string;
    username: string | null;
    avatarUrl: string | null;
    isLifetimeFree: boolean;
    subscriptionStatus: SubscriptionStatus;
    subscriptionTier: UserSubscriptionPlan;
    trialEndsAt: string | null;
    subscriptionEndsAt: string | null;
    createdAt: string;
    authProvider: AuthProvider;
    loginTime: string;
    travelStyle: string;
    currentFocus: string;
}

export type UserRecord = StoredUserProfile;

export const USER_PROFILE_CACHE_KEY = "tripjournal:user:v1";

const DEFAULT_PROFILE: StoredUserProfile = {
    id: "",
    email: "",
    username: null,
    avatarUrl: null,
    isLifetimeFree: false,
    subscriptionStatus: "inactive",
    subscriptionTier: "free",
    trialEndsAt: null,
    subscriptionEndsAt: null,
    createdAt: new Date().toISOString(),
    authProvider: "email",
    loginTime: new Date().toISOString(),
    travelStyle: "Slow routes, old streets, good notes",
    currentFocus: "Planning the next chapter"
};

function mapProvider(provider: string | undefined): AuthProvider {
    if (provider === "google" || provider === "facebook") {
        return provider;
    }

    return "email";
}

function getFallbackUsername(email: string): string | null {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
        return null;
    }

    const [localPart] = trimmedEmail.split("@");
    return localPart || null;
}

export function createStoredUserProfileFromSession(sessionUser: {
    id: string;
    email?: string | null;
    app_metadata?: { provider?: string };
    user_metadata?: { full_name?: string; name?: string; avatar_url?: string; username?: string };
}): StoredUserProfile {
    const email = sessionUser.email ?? "";
    const username = sessionUser.user_metadata?.username?.trim()
        || sessionUser.user_metadata?.name?.trim()
        || sessionUser.user_metadata?.full_name?.trim()
        || getFallbackUsername(email);

    return {
        ...DEFAULT_PROFILE,
        id: sessionUser.id,
        email,
        username,
        avatarUrl: sessionUser.user_metadata?.avatar_url?.trim() || null,
        authProvider: mapProvider(sessionUser.app_metadata?.provider),
        loginTime: new Date().toISOString()
    };
}

export function getStoredUserProfile(): StoredUserProfile | null {
    try {
        const stored = localStorage.getItem(USER_PROFILE_CACHE_KEY);
        if (!stored) {
            return null;
        }

        const parsed = JSON.parse(stored) as Partial<StoredUserProfile> | null;
        if (!parsed || typeof parsed !== "object") {
            return null;
        }

        return {
            ...DEFAULT_PROFILE,
            ...parsed,
            id: typeof parsed.id === "string" ? parsed.id : DEFAULT_PROFILE.id,
            email: typeof parsed.email === "string" ? parsed.email : DEFAULT_PROFILE.email,
            username: typeof parsed.username === "string" || parsed.username === null ? parsed.username : DEFAULT_PROFILE.username,
            avatarUrl: typeof parsed.avatarUrl === "string" || parsed.avatarUrl === null ? parsed.avatarUrl : DEFAULT_PROFILE.avatarUrl,
            isLifetimeFree: typeof parsed.isLifetimeFree === "boolean" ? parsed.isLifetimeFree : DEFAULT_PROFILE.isLifetimeFree,
            subscriptionStatus:
                parsed.subscriptionStatus === "inactive" ||
                parsed.subscriptionStatus === "trialing" ||
                parsed.subscriptionStatus === "active" ||
                parsed.subscriptionStatus === "canceled" ||
                parsed.subscriptionStatus === "expired" ||
                parsed.subscriptionStatus === "past_due"
                    ? parsed.subscriptionStatus
                    : DEFAULT_PROFILE.subscriptionStatus,
            subscriptionTier:
                parsed.subscriptionTier === "free" ||
                parsed.subscriptionTier === "monthly" ||
                parsed.subscriptionTier === "yearly" ||
                parsed.subscriptionTier === "lifetime" ||
                parsed.subscriptionTier === "beta-lifetime"
                    ? parsed.subscriptionTier
                    : DEFAULT_PROFILE.subscriptionTier,
            trialEndsAt: typeof parsed.trialEndsAt === "string" || parsed.trialEndsAt === null ? parsed.trialEndsAt : DEFAULT_PROFILE.trialEndsAt,
            subscriptionEndsAt: typeof parsed.subscriptionEndsAt === "string" || parsed.subscriptionEndsAt === null ? parsed.subscriptionEndsAt : DEFAULT_PROFILE.subscriptionEndsAt,
            createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : DEFAULT_PROFILE.createdAt,
            authProvider:
                parsed.authProvider === "email" || parsed.authProvider === "google" || parsed.authProvider === "facebook"
                    ? parsed.authProvider
                    : DEFAULT_PROFILE.authProvider,
            loginTime: typeof parsed.loginTime === "string" ? parsed.loginTime : DEFAULT_PROFILE.loginTime,
            travelStyle: typeof parsed.travelStyle === "string" ? parsed.travelStyle : DEFAULT_PROFILE.travelStyle,
            currentFocus: typeof parsed.currentFocus === "string" ? parsed.currentFocus : DEFAULT_PROFILE.currentFocus
        };
    } catch {
        return null;
    }
}

export const getCachedUserRecord = getStoredUserProfile;

export function saveStoredUserProfile(profile: StoredUserProfile): void {
    try {
        localStorage.setItem(USER_PROFILE_CACHE_KEY, JSON.stringify(profile));
    } catch {
        // Ignore storage failures.
    }
}

export const saveCachedUserRecord = saveStoredUserProfile;

export function clearStoredUserProfile(): void {
    try {
        localStorage.removeItem(USER_PROFILE_CACHE_KEY);
    } catch {
        // Ignore storage failures.
    }
}

export const createUserRecordFromAuth = createStoredUserProfileFromSession;
