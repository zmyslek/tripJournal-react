import { supabase } from "./supabase/client";
import type { SubscriptionPlan } from "../types/subscription";
import { getStoredUserProfile, saveStoredUserProfile } from "../types/user";

export type CheckoutPlan = Extract<SubscriptionPlan, "monthly" | "yearly" | "lifetime">;

interface CheckoutSessionResponse {
    id: string;
    url: string;
}

interface BillingPortalResponse {
    url: string;
}

interface UserSubscriptionRow {
    is_lifetime_free: boolean;
    subscription_status: "inactive" | "trialing" | "active" | "canceled" | "expired" | "past_due";
    subscription_tier: SubscriptionPlan;
    trial_ends_at: string | null;
    subscription_ends_at: string | null;
}

async function getAccessToken(): Promise<string> {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    if (!accessToken) {
        throw new Error("Sign in before choosing a paid plan.");
    }

    return accessToken;
}

export async function createCheckoutSession(plan: CheckoutPlan): Promise<CheckoutSessionResponse> {
    const accessToken = await getAccessToken();

    const response = await fetch("/api/stripe", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ plan })
    });

    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.error || "Failed to create checkout session.");
    }

    return payload;
}

export async function redirectToCheckout(plan: CheckoutPlan): Promise<void> {
    const { url } = await createCheckoutSession(plan);
    window.location.assign(url);
}

export async function createBillingPortalSession(): Promise<BillingPortalResponse> {
    const accessToken = await getAccessToken();

    const response = await fetch("/api/stripe-portal", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.error || "Failed to create billing portal session.");
    }

    return payload;
}

export async function redirectToBillingPortal(): Promise<void> {
    const { url } = await createBillingPortalSession();
    window.location.assign(url);
}

export async function refreshCachedSubscription(): Promise<void> {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) {
        return;
    }

    const { data: row, error } = await supabase
        .from("users")
        .select("is_lifetime_free, subscription_status, subscription_tier, trial_ends_at, subscription_ends_at")
        .eq("id", user.id)
        .maybeSingle<UserSubscriptionRow>();

    if (error || !row) {
        return;
    }

    const cachedProfile = getStoredUserProfile();
    if (!cachedProfile) {
        return;
    }

    saveStoredUserProfile({
        ...cachedProfile,
        isLifetimeFree: row.is_lifetime_free,
        subscriptionStatus: row.subscription_status,
        subscriptionTier: row.subscription_tier,
        trialEndsAt: row.trial_ends_at,
        subscriptionEndsAt: row.subscription_ends_at
    });
}
