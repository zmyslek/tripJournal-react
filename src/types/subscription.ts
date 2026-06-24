import type { UserSubscriptionPlan } from "./user";

export type SubscriptionPlan = UserSubscriptionPlan;

export interface UserSubscription {
    plan: SubscriptionPlan;
    renewalDate: string | null;
    startDate: string;
    cancelledAt: string | null;
}

export interface SubscriptionTier {
    id: SubscriptionPlan;
    name: string;
    price: string | number;
    billingPeriod: 'month' | 'year' | 'lifetime' | null;
    features: string[];
    highlighted: boolean;
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionPlan, SubscriptionTier> = {
    free: {
        id: 'free',
        name: 'Free',
        price: 0,
        billingPeriod: null,
        features: [
            'Mark visited countries',
            'Store notes per country',
            'Basic gallery',
            'Offline access'
        ],
        highlighted: false
    },
    monthly: {
        id: 'monthly',
        name: 'Premium Monthly',
        price: '$2.99',
        billingPeriod: 'month',
        features: [
            'All Free features',
            'Unlimited photos',
            'Photo quiz game',
            'Spotify playlists',
            'TikTok videos',
            'Step tracking',
            'Advanced itineraries',
            'Priority support'
        ],
        highlighted: true
    },
    yearly: {
        id: 'yearly',
        name: 'Premium Yearly',
        price: '$19.99',
        billingPeriod: 'year',
        features: [
            'All Premium features',
            'Save 44% vs monthly',
            'Exclusive badges',
            'Annual travel stats'
        ],
        highlighted: false
    },
    lifetime: {
        id: 'lifetime',
        name: 'Lifetime',
        price: '$49.99',
        billingPeriod: 'lifetime',
        features: [
            'Premium access forever',
            'One-time purchase',
            'All current + future features',
            'Lifetime support'
        ],
        highlighted: false
    },
    'beta-lifetime': {
        id: 'beta-lifetime',
        name: 'Beta Lifetime',
        price: 'Free',
        billingPeriod: 'lifetime',
        features: [
            'Lifetime premium access',
            'Exclusive beta tester badge',
            'Early access to new features',
            'Direct feedback channel'
        ],
        highlighted: false
    }
};

export function getFormattedRenewalDate(renewalDate: string | null): string {
    if (!renewalDate) return '';

    try {
        const date = new Date(renewalDate);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return renewalDate;
    }
}
