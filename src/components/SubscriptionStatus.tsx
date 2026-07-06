import { useEffect, useState } from "react";
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getFormattedRenewalDate, SUBSCRIPTION_TIERS } from '../types/subscription';
import { loadJournalProfile } from "../lib/supabase/journal";

export function SubscriptionStatus() {
    const [plan, setPlan] = useState<keyof typeof SUBSCRIPTION_TIERS>("free");
    const [renewalDate, setRenewalDate] = useState<string | null>(null);
    const [isBeta, setIsBeta] = useState(false);

    useEffect(() => {
        let mounted = true;

        void loadJournalProfile()
            .then(({ profile }) => {
                if (!mounted) {
                    return;
                }

                setPlan(profile.subscriptionTier);
                setRenewalDate(profile.subscriptionEndsAt ?? profile.trialEndsAt);
                setIsBeta(profile.subscriptionTier === "beta-lifetime" || profile.isLifetimeFree);
            })
            .catch(() => {
                // Keep the fallback subscription data if Supabase is unavailable.
            });

        return () => {
            mounted = false;
        };
    }, []);

    const tier = SUBSCRIPTION_TIERS[plan];
    const isPremium = plan !== 'free' || isBeta;
    const renewalLabel = getFormattedRenewalDate(renewalDate);

    return (
        <div className="space-y-4">
            <div
                className={`relative overflow-hidden rounded-[1rem] border p-5 shadow-[0_12px_32px_rgb(80_48_13_/_12%),inset_0_0_0_1px_rgb(255_244_231_/_45%)] transition ${
                    isBeta
                        ? "border-[#7A3F00]/55 bg-[linear-gradient(140deg,rgba(234,182,129,0.42),rgba(143,90,32,0.2))]"
                        : isPremium
                          ? "border-[#CF8D45]/65 bg-[linear-gradient(150deg,rgba(255,240,222,0.98),rgba(234,182,129,0.22))]"
                          : "border-[#8f5a20]/35 bg-[linear-gradient(160deg,rgba(255,247,238,0.98),rgba(255,234,212,0.75))]"
                }`}
            >
                <p className="font-adamina text-[0.68rem] uppercase tracking-[0.22em] text-[#7A3F00]/85">Current plan</p>

                <div className="mt-3 flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-adamina text-[1.35rem] text-[#7A3F00]">{tier.name}</h3>
                            {isBeta && (
                                <span className="rounded-full border border-[#7A3F00]/55 bg-[#7A3F00] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#FFEAD4]">
                                    Beta tester
                                </span>
                            )}
                            {isPremium && !isBeta && (
                                <span className="rounded-full border border-[#CF8D45] bg-[#fff4e7] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#7A3F00]">
                                    Premium
                                </span>
                            )}
                        </div>

                        <p className="mt-2 font-cormorant text-[1.05rem] text-[#7A3F00]/80">
                            {isPremium && renewalLabel && plan !== 'lifetime' && !isBeta ? (
                                <>
                                    Renews on <span className="font-semibold text-[#7A3F00]">{renewalLabel}</span>
                                </>
                            ) : isPremium && plan === 'lifetime' ? (
                                'Lifetime access unlocked.'
                            ) : isPremium && isBeta ? (
                                'Unlimited premium access while the beta is active.'
                            ) : (
                                'Upgrade to unlock premium travel tools and perks.'
                            )}
                        </p>
                    </div>

                    <Link
                        to="/settings"
                        className="inline-flex items-center gap-2 rounded-[0.75rem] border border-[#7A3F00] bg-[#fff4e7]/90 px-3.5 py-2 font-cormorant text-sm font-semibold text-[#7A3F00] transition hover:bg-[#7A3F00] hover:text-[#fff4e7]"
                    >
                        {isPremium ? 'Manage' : 'Upgrade'} <ArrowRight size={16} />
                    </Link>
                </div>
            </div>

            {plan === 'free' && !isBeta && (
                <div className="rounded-[0.9rem] border border-dashed border-[#b16a24]/55 bg-[#fff4e7]/85 p-4">
                    <p className="mb-2 font-cormorant text-sm font-semibold text-[#7A3F00]">
                        Premium unlocks:
                    </p>
                    <ul className="space-y-1 text-sm text-[#7A3F00]/80 font-cormorant">
                        <li>✨ Photo quiz game</li>
                        <li>🎵 Spotify playlists per location</li>
                        <li>📺 TikTok videos for destinations</li>
                        <li>👟 Step tracking & travel stats</li>
                    </ul>
                </div>
            )}
        </div>
    );
}

export default SubscriptionStatus;
