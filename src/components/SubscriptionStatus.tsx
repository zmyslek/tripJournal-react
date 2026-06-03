import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getUserSubscription, getFormattedRenewalDate, SUBSCRIPTION_TIERS } from '../types/subscription';
import { getStoredUserProfile } from '../types/user';

export function SubscriptionStatus() {
    const storedUser = getStoredUserProfile();
    const subscription = getUserSubscription();
    const plan = subscription.plan;
    const tier = SUBSCRIPTION_TIERS[plan];
    
    const isBeta = plan === 'beta-lifetime' || storedUser?.isLifetimeFree === true;
    const isPremium = plan !== 'free' || isBeta;
    const renewalDate = getFormattedRenewalDate(subscription.renewalDate);

    return (
        <div className="mt-8 space-y-4">
            {/* Subscription Banner */}
            <div className={`rounded-lg border-2 p-6 transition ${
                isBeta 
                    ? 'border-[#7A3F00] bg-gradient-to-r from-[#EAB681]/10 to-[#CF8D45]/10'
                    : isPremium
                    ? 'border-[#CF8D45] bg-[#EAB681]/10'
                    : 'border-[#8f5a20]/35 bg-[#FFEAD4]/50'
            }`}>
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h3 className="font-adamina text-xl font-bold text-[#7A3F00]">
                                {tier.name}
                            </h3>
                            {isBeta && (
                                <span className="rounded-full bg-[#7A3F00] px-3 py-1 text-xs font-semibold text-[#FFEAD4]">
                                    Beta Tester ✨
                                </span>
                            )}
                            {isPremium && !isBeta && (
                                <span className="rounded-full border border-[#CF8D45] px-3 py-1 text-xs font-semibold text-[#7A3F00]">
                                    Premium
                                </span>
                            )}
                        </div>
                        
                        <p className="mt-2 font-cormorant text-[#7A3F00]/70">
                            {isPremium && renewalDate && subscription.plan !== 'lifetime' && !isBeta ? (
                                <>
                                    Renews on <span className="font-semibold">{renewalDate}</span>
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
                        className="flex items-center gap-2 rounded-lg border border-[#7A3F00] px-4 py-2 font-cormorant text-sm font-semibold text-[#7A3F00] transition hover:bg-[#7A3F00]/10"
                    >
                        {isPremium ? 'Manage' : 'Upgrade'} <ArrowRight size={16} />
                    </Link>
                </div>
            </div>

            {/* Feature Highlights for Free Users */}
            {plan === 'free' && !isBeta && (
                <div className="rounded-lg bg-[#FFEAD4]/50 p-4 border border-[#8f5a20]/35">
                    <p className="font-cormorant text-sm font-semibold text-[#7A3F00] mb-2">
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
