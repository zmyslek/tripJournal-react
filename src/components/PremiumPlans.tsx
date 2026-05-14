import { useMemo, useState } from 'react';
import { Check, Lock, X } from 'lucide-react';
import { SUBSCRIPTION_TIERS, getUserSubscription, type SubscriptionPlan } from '../types/subscription';

export type PremiumPlansProps = Record<string, never>;

interface IntegrationCard {
    id: 'spotify' | 'tiktok' | 'step-counter';
    title: string;
    description: string;
    availability: 'premium' | 'all';
}

interface PaymentMethodOption {
    id: 'stripe' | 'paypal' | 'apple-pay' | 'google-pay' | 'ideal';
    label: string;
    status: 'planned' | 'preview';
}

const selectablePlans: SubscriptionPlan[] = ['free', 'monthly', 'yearly', 'lifetime'];

const integrationCards: IntegrationCard[] = [
    {
        id: 'spotify',
        title: 'Spotify playlists',
        description: 'Generate trip playlists by country and city.',
        availability: 'premium'
    },
    {
        id: 'tiktok',
        title: 'TikTok destination feed',
        description: 'Surface local travel clips for selected locations.',
        availability: 'premium'
    },
    {
        id: 'step-counter',
        title: 'Step counter',
        description: 'Track trip steps with daily and total summaries.',
        availability: 'premium'
    }
];

const paymentMethods: PaymentMethodOption[] = [
    { id: 'stripe', label: 'Stripe', status: 'preview' },
    { id: 'paypal', label: 'PayPal', status: 'planned' },
    { id: 'apple-pay', label: 'Apple Pay', status: 'planned' },
    { id: 'google-pay', label: 'Google Pay', status: 'planned' },
    { id: 'ideal', label: 'iDEAL', status: 'planned' }
];

export function PremiumPlans() {
    const currentSubscription = getUserSubscription();
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [requestedPlan, setRequestedPlan] = useState<SubscriptionPlan | null>(null);

    const hasPremium = useMemo(() => currentSubscription.plan !== 'free', [currentSubscription.plan]);

    const openPlanModal = (planId: SubscriptionPlan) => {
        setRequestedPlan(planId);
        setIsPlanModalOpen(true);
    };

    const closePlanModal = () => {
        setIsPlanModalOpen(false);
        setRequestedPlan(null);
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="font-adamina text-2xl font-bold text-[#7A3F00] mb-2">
                    Upgrade to Premium
                </h3>
                <p className="font-cormorant text-[#7A3F00]/70">
                    Choose the plan that works best for you. All premium plans include unlimited access to all features.
                </p>
            </div>

            {/* Plans Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {selectablePlans.map((planId) => {
                    const tier = SUBSCRIPTION_TIERS[planId];
                    const isCurrentPlan = currentSubscription.plan === planId;
                    const isHighlighted = tier.highlighted;

                    return (
                        <div
                            key={planId}
                            className={`relative rounded-lg border-2 p-6 transition ${
                                isCurrentPlan
                                    ? 'border-[#7A3F00] bg-[#EAB681]/10 shadow-[0_8px_24px_rgba(122,63,0,0.2)]'
                                    : isHighlighted
                                    ? 'border-[#CF8D45] bg-[#EAB681]/10 shadow-[0_8px_24px_rgba(207,141,69,0.15)]'
                                    : 'border-[#CF8D45]/50 bg-[#FFEAD4]/30 hover:border-[#CF8D45] hover:bg-[#FFEAD4]/50'
                            }`}
                        >
                            {/* "Recommended" or "Current" badge */}
                            {isCurrentPlan && (
                                <div className="absolute -top-3 left-4 rounded-full bg-[#7A3F00] px-3 py-1 text-xs font-semibold text-[#FFEAD4]">
                                    Current Plan
                                </div>
                            )}
                            {isHighlighted && !isCurrentPlan && (
                                <div className="absolute -top-3 left-4 rounded-full bg-[#CF8D45] px-3 py-1 text-xs font-semibold text-[#FFEAD4]">
                                    Most Popular
                                </div>
                            )}

                            {/* Plan Name */}
                            <h4 className="font-adamina text-lg font-bold text-[#7A3F00] mb-2">
                                {tier.name}
                            </h4>

                            {/* Price */}
                            <div className="mb-4">
                                {typeof tier.price === 'number' ? (
                                    <div className="font-adamina text-3xl font-bold text-[#7A3F00]">
                                        Free
                                    </div>
                                ) : (
                                    <div>
                                        <div className="font-adamina text-3xl font-bold text-[#7A3F00]">
                                            {tier.price}
                                        </div>
                                        <p className="text-sm text-[#7A3F00]/70 font-cormorant">
                                            {tier.billingPeriod === 'month'
                                                ? 'per month'
                                                : tier.billingPeriod === 'year'
                                                ? 'per year'
                                                : 'one-time'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* CTA Button */}
                            <button
                                disabled={isCurrentPlan}
                                onClick={() => openPlanModal(planId)}
                                className={`mb-6 w-full rounded-lg py-2.5 font-cormorant font-semibold transition ${
                                    isCurrentPlan
                                        ? 'bg-[#7A3F00]/30 text-[#7A3F00]/50 cursor-not-allowed'
                                        : 'bg-[#7A3F00] text-[#FFEAD4] hover:bg-[#5A392B]'
                                }`}
                            >
                                {isCurrentPlan ? 'Current Plan' : 'Select'}
                            </button>

                            {/* Features List */}
                            <ul className="space-y-2.5 text-sm">
                                {tier.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start gap-2.5 font-cormorant text-[#7A3F00]">
                                        <Check size={18} className="shrink-0 text-[#CF8D45] mt-0.5" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </div>

            {/* API Integrations with premium lock */}
            <section className="rounded-lg border border-[#CF8D45]/35 bg-[#FFEAD4]/35 p-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h4 className="font-adamina text-xl text-[#7A3F00]">API integrations</h4>
                        <p className="mt-1 font-cormorant text-[#7A3F00]/75">
                            Connect travel services directly in TripJournal.
                        </p>
                    </div>
                    <span className="rounded-full border border-[#CF8D45] px-3 py-1 text-xs font-semibold text-[#7A3F00]">
                        {hasPremium ? 'Premium unlocked' : 'Premium required'}
                    </span>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                    {integrationCards.map((card) => {
                        const isLocked = card.availability === 'premium' && !hasPremium;

                        return (
                            <article
                                key={card.id}
                                className={`relative overflow-hidden rounded-[0.9rem] border border-[#CF8D45]/45 bg-[#FFF4E7] p-4 transition ${
                                    isLocked ? 'opacity-90' : 'shadow-[0_6px_16px_rgba(122,63,0,0.08)]'
                                }`}
                            >
                                {isLocked ? (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[2px] bg-[#FFEAD4]/60">
                                        <span className="inline-flex items-center gap-2 rounded-full border border-[#7A3F00] bg-[#5A392B] px-3 py-1 text-xs font-semibold text-[#FFEAD4]">
                                            <Lock size={14} /> Locked
                                        </span>
                                    </div>
                                ) : null}

                                <h5 className="font-adamina text-lg text-[#7A3F00]">{card.title}</h5>
                                <p className="mt-2 font-cormorant text-[1rem] text-[#7A3F00]/80">{card.description}</p>
                                <button
                                    type="button"
                                    onClick={() => openPlanModal('monthly')}
                                    className="mt-4 rounded-full border border-[#CF8D45] bg-[#FFEAD4] px-3 py-1.5 text-xs font-semibold text-[#7A3F00] transition hover:bg-[#F6DFC1]"
                                >
                                    {isLocked ? 'Unlock premium' : 'Configured'}
                                </button>
                            </article>
                        );
                    })}
                </div>
            </section>

            {/* Payment methods */}
            <section className="rounded-lg border border-[#CF8D45]/35 bg-[#FFEAD4]/30 p-6">
                <h4 className="font-adamina text-xl text-[#7A3F00]">Payment methods</h4>
                <p className="mt-1 font-cormorant text-[#7A3F00]/75">
                    Checkout setup is in progress. Methods below are prepared for launch.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {paymentMethods.map((method) => (
                        <div key={method.id} className="rounded-[0.8rem] border border-[#CF8D45]/45 bg-[#FFF4E7] px-4 py-3">
                            <p className="font-adamina text-[0.95rem] text-[#50300D]">{method.label}</p>
                            <p className="mt-1 font-cormorant text-sm text-[#7A3F00]/70">
                                {method.status === 'preview' ? 'Preview ready' : 'Planned'}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Invoice management */}
            <section className="rounded-lg border border-[#CF8D45]/35 bg-[#FFEAD4]/30 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h4 className="font-adamina text-xl text-[#7A3F00]">Invoice management</h4>
                        <p className="mt-1 font-cormorant text-[#7A3F00]/75">
                            Keep billing records in one place.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="rounded-full border border-[#7A3F00] bg-[#5A392B] px-4 py-2 text-sm font-semibold text-[#FFEAD4] transition hover:bg-[#7A3F00]"
                    >
                        Download invoices
                    </button>
                </div>

                <div className="mt-4 rounded-[0.9rem] border border-dashed border-[#CF8D45] bg-[#FFF4E7]/80 p-4">
                    <p className="font-cormorant text-[#7A3F00]/80">
                        No invoices yet. Paid invoices will appear here after payment processing is enabled.
                    </p>
                </div>
            </section>

            {/* FAQ or Additional Info */}
            <div className="mt-8 rounded-lg border border-[#CF8D45]/35 bg-[#FFEAD4]/30 p-6">
                <p className="font-cormorant text-sm text-[#7A3F00]/80 mb-4">
                    <span className="font-semibold">Note:</span> Payment processing is currently in development. Premium features are available for testing with your current plan selection.
                </p>
                <p className="font-cormorant text-xs text-[#7A3F00]/60">
                    First 50 beta users get lifetime premium access for free. Updates coming soon!
                </p>
            </div>

            {isPlanModalOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#50300D]/45 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-[34rem] rounded-[1rem] border border-[#CF8D45] bg-[#FFEAD4] p-6 shadow-[0_22px_48px_rgba(35,18,8,0.35)]">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="font-adamina text-[0.72rem] uppercase tracking-[0.18em] text-[#7A3F00]">Plan request</p>
                                <h5 className="mt-2 font-adamina text-2xl text-[#50300D]">
                                    {requestedPlan ? SUBSCRIPTION_TIERS[requestedPlan].name : 'Select a plan'}
                                </h5>
                            </div>
                            <button
                                type="button"
                                onClick={closePlanModal}
                                className="rounded-full border border-[#CF8D45] bg-[#FFF7EE] p-2 text-[#50300D] transition hover:bg-[#F6DFC1]"
                                aria-label="Close plan selection modal"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <p className="mt-4 font-cormorant text-[1.08rem] text-[#7A3F00]/80">
                            Self-serve plan changes are not enabled yet. This request is shown for preview and onboarding flows.
                        </p>

                        <div className="mt-5 rounded-[0.85rem] border border-[#CF8D45]/45 bg-[#FFF4E7] p-4">
                            <p className="font-cormorant text-sm text-[#7A3F00]/80">
                                Next step: use Stripe checkout once payment wiring is enabled.
                            </p>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={closePlanModal}
                                className="rounded-full border border-[#CF8D45] bg-[#FFF7EE] px-4 py-2 text-sm font-semibold text-[#50300D] transition hover:bg-[#F6DFC1]"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={closePlanModal}
                                className="rounded-full border border-[#7A3F00] bg-[#5A392B] px-4 py-2 text-sm font-semibold text-[#FFEAD4] transition hover:bg-[#7A3F00]"
                            >
                                Request access
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export default PremiumPlans;
