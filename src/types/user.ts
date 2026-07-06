export type AuthProvider = "email" | "google" | "facebook" | "microsoft";
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

function mapProvider(provider: string | undefined): AuthProvider {
    if (provider === "google" || provider === "facebook") {
        return provider;
    }

    if (provider === "azure") {
        return "microsoft";
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
        id: sessionUser.id,
        email,
        username,
        avatarUrl: sessionUser.user_metadata?.avatar_url?.trim() || null,
        isLifetimeFree: false,
        subscriptionStatus: "inactive",
        subscriptionTier: "free",
        trialEndsAt: null,
        subscriptionEndsAt: null,
        createdAt: new Date().toISOString(),
        authProvider: mapProvider(sessionUser.app_metadata?.provider),
        loginTime: new Date().toISOString(),
        travelStyle: "Slow routes, old streets, good notes",
        currentFocus: "Planning the next chapter"
    };
}

export const createUserRecordFromAuth = createStoredUserProfileFromSession;
