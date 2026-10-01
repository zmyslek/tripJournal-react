/*
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getUserSubscription, getFormattedRenewalDate, SUBSCRIPTION_TIERS } from '../types/subscription';
import { getStoredUserProfile } from '../types/user';

export function SubscriptionStatus() {
    const storedUser = getStoredUserProfile();
    const subscription = getUserSubscription();
    const plan = storedUser?.subscriptionTier ?? subscription.plan;
    const tier = SUBSCRIPTION_TIERS[plan];
    
    const isBeta = plan === 'beta-lifetime' || storedUser?.isLifetimeFree === true;
    const isPremium = plan !== 'free' || isBeta;
    const renewalDate = getFormattedRenewalDate(storedUser?.subscriptionEndsAt ?? subscription.renewalDate);

    return (
        <div className="mt-8 space-y-4">
            // Subscription Banner
            <div className={`rounded-[1rem] border p-6 shadow-[inset_0_1px_0_#ffffff2b] interactive-transition hover:shadow-[inset_0_1px_0_#ffffff2b,0_8px_20px_rgb(122_63_0_/_15%)] ${
                isBeta 
                    ? 'border-[#eab681]/40 bg-gradient-to-r from-[#eab681]/25 to-[#cf8d45]/25'
                    : isPremium
                    ? 'border-[#eab681]/25 bg-[#ffead414]'
                    : 'border-[#eab681]/20 bg-[#ffead40d]'
            }`}>
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h3 className="font-adamina text-xl font-bold text-[#fff4e7]">
                                {tier.name}
                            </h3>
                            {isBeta && (
                                <span className="rounded-full bg-[#7A3F00] px-3 py-1 text-xs font-semibold text-[#FFEAD4]">
                                    Beta Tester ✨
                                </span>
                            )}
                            {isPremium && !isBeta && (
                                <span className="rounded-full border border-[#cf8d45] bg-[#cf8d45]/15 px-3 py-1 text-xs font-semibold text-[#fff4e7]">
                                    Premium
                                </span>
                            )}
                        </div>
                        
                        <p className="mt-2 font-cormorant text-[#f7dfca]/80">
                            {isPremium && renewalDate && subscription.plan !== 'lifetime' && !isBeta ? (
                                <>
                                    Renews on <span className="font-semibold text-[#fff4e7]">{renewalDate}</span>
                                </>
                            ) : isPremium && subscription.plan === 'lifetime' ? (
                                'Lifetime access'
                            ) : isPremium && isBeta ? (
                                'Unlimited premium access'
                            ) : (
                                'Upgrade to unlock premium features'
                            )}
                        </p>
                    </div>

                    <Link
                        to="/settings"
                        className="flex items-center gap-2 rounded-full border border-[#cf8d45] bg-[#cf8d45] px-4 py-2 font-cormorant text-sm font-semibold text-[#fff4e7] interactive-transition hover:-translate-y-px hover:bg-[#b97731]"
                    >
                        {isPremium ? 'Manage' : 'Upgrade'} <ArrowRight size={16} />
                    </Link>
                </div>
            </div>

            // Feature Highlights for Free Users
            {plan === 'free' && !isBeta && (
                <div className="rounded-[1rem] border border-[#eab681]/20 bg-[#ffead40d] p-4 shadow-[inset_0_1px_0_#ffffff2b]">
                    <p className="font-cormorant text-sm font-semibold text-[#f6d7b5] mb-2">
                        Premium unlocks:
                    </p>
                    <ul className="space-y-1 text-sm text-[#f7dfca] font-cormorant">
                        <li>✨ Photo quiz game</li>
                        <li>🎵 Spotify playlists per location</li>
                        <li>📺 TikTok videos for destinations</li>
                        <li>👟 Step tracking &amp; travel stats</li>
                    </ul>
                </div>
            )}
        </div>
    );
}

export default SubscriptionStatus;
*/