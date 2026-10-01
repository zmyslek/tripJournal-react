import { useMemo, useState, useEffect } from "react";
import { Settings, HelpCircle, Edit } from "lucide-react";
import type { ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useScrollToTop } from "../hooks/useScrollToTop";
import compassAvatar from "../assets/avatars/compass.png";
import SubscriptionStatus from "../components/SubscriptionStatus";
import globeAvatar from "../assets/avatars/globe.png";
import mountainsAvatar from "../assets/avatars/mountains.png";
import passportAvatar from "../assets/avatars/passport.png";
import postcardAvatar from "../assets/avatars/postcard.png";
import suitcaseAvatar from "../assets/avatars/suitcase.png";
import { supabase } from "../lib/supabase/client";
import { clearStoredUserProfile, getStoredUserProfile, saveStoredUserProfile } from "../types/user";

export type ProfileProps = Record<string, never>;

type ProfileForm = {
    name: string;
    email: string;
    travelStyle: string;
    currentFocus: string;
    avatar: string;
};

const avatarOptions = [
    { id: "compass", label: "Compass", src: compassAvatar },
    { id: "suitcase", label: "Suitcase", src: suitcaseAvatar },
    { id: "mountains", label: "Mountains", src: mountainsAvatar },
    { id: "passport", label: "Passport", src: passportAvatar },
    { id: "postcard", label: "Postcard", src: postcardAvatar },
    { id: "globe", label: "Globe", src: globeAvatar }
];

const profileStats = [
    { label: "Visited", value: "18" },
    { label: "Wishlist", value: "7" },
    { label: "Returns", value: "4" }
];

const defaultProfile: ProfileForm = {
    name: "Traveler",
    email: "",
    travelStyle: "Slow routes, old streets, good notes",
    currentFocus: "Planning the next chapter",
    avatar: compassAvatar
};

const PROFILE_CACHE_KEY = "tripjournal:profile:v1";
const AUTH_CACHE_KEY = "tripjournal:auth:v1";

function getCachedProfile(): ProfileForm {
    const storedUser = getStoredUserProfile();

    if (storedUser) {
        return {
            name: storedUser.username ?? storedUser.email.split("@")[0] ?? defaultProfile.name,
            email: storedUser.email || defaultProfile.email,
            travelStyle: storedUser.travelStyle || defaultProfile.travelStyle,
            currentFocus: storedUser.currentFocus || defaultProfile.currentFocus,
            avatar: storedUser.avatarUrl || defaultProfile.avatar
        };
    }

    try {
        const cachedProfile = localStorage.getItem(PROFILE_CACHE_KEY);
        if (!cachedProfile) {
            return defaultProfile;
        }

        const parsedProfile = JSON.parse(cachedProfile);
        if (!parsedProfile || typeof parsedProfile !== "object") {
            return defaultProfile;
        }

        return {
            name: typeof parsedProfile.name === "string" && parsedProfile.name.trim() ? parsedProfile.name : defaultProfile.name,
            email: typeof parsedProfile.email === "string" && parsedProfile.email.trim() ? parsedProfile.email : defaultProfile.email,
            travelStyle: typeof parsedProfile.travelStyle === "string" && parsedProfile.travelStyle.trim() ? parsedProfile.travelStyle : defaultProfile.travelStyle,
            currentFocus: typeof parsedProfile.currentFocus === "string" && parsedProfile.currentFocus.trim() ? parsedProfile.currentFocus : defaultProfile.currentFocus,
            avatar: typeof parsedProfile.avatar === "string" && parsedProfile.avatar.trim() ? parsedProfile.avatar : defaultProfile.avatar
        };
    } catch {
        return defaultProfile;
    }
}

export function Profile() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<ProfileForm>(() => getCachedProfile());
    const [draftProfile, setDraftProfile] = useState<ProfileForm>(() => getCachedProfile());
    const [isEditing, setIsEditing] = useState(false);
    const { showScrollTop, scrollToTop } = useScrollToTop();
    const [scrollBtnBottom, setScrollBtnBottom] = useState(window.innerHeight * 0.02);

    useEffect(() => {
        function adjustScrollButton() {
            const footer = document.querySelector("footer");
            const baseBottom = window.innerHeight * 0.02;
            if (!footer) {
                setScrollBtnBottom(baseBottom);
                return;
            }

            const rect = footer.getBoundingClientRect();
            const overlap = Math.max(0, window.innerHeight - rect.top);
            const padding = window.innerHeight * 0.01;
            if (overlap > 0) {
                setScrollBtnBottom(baseBottom + overlap + padding);
            } else {
                setScrollBtnBottom(baseBottom);
            }
        }

        adjustScrollButton();
        window.addEventListener("scroll", adjustScrollButton, { passive: true });
        window.addEventListener("resize", adjustScrollButton);
        return () => {
            window.removeEventListener("scroll", adjustScrollButton);
            window.removeEventListener("resize", adjustScrollButton);
        };
    }, []);

    const initials = useMemo(() => {
        return profile.name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("") || "JD";
    }, [profile.name]);

    const openEditor = () => {
        setDraftProfile(profile);
        setIsEditing(true);
    };

    const updateDraft = (field: keyof ProfileForm, value: string) => {
        setDraftProfile((currentProfile) => ({
            ...currentProfile,
            [field]: value
        }));
    };

    const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.addEventListener("load", () => {
            if (typeof reader.result === "string") {
                updateDraft("avatar", reader.result);
            }
        });
        reader.readAsDataURL(file);
    };

    const saveProfile = () => {
        setProfile(draftProfile);
        const storedUser = getStoredUserProfile();
        if (storedUser) {
            saveStoredUserProfile({
                ...storedUser,
                username: draftProfile.name.trim() || storedUser.username,
                email: draftProfile.email.trim() || storedUser.email,
                avatarUrl: draftProfile.avatar || storedUser.avatarUrl,
                travelStyle: draftProfile.travelStyle,
                currentFocus: draftProfile.currentFocus
            });
        }
        try {
            localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(draftProfile));
        } catch {
            // Ignore profile cache write failures.
        }
        setIsEditing(false);
    };

    const handleLogout = () => {
        void supabase.auth.signOut();

        try {
            localStorage.removeItem(AUTH_CACHE_KEY);
        } catch {
            // Ignore storage failures and still continue with navigation.
        }

        clearStoredUserProfile();

        navigate("/welcome", { replace: true });
    };


    return (
        <section className="mx-auto w-full max-w-[min(95vw,1380px)] px-[max(1.25rem,5%)] py-[max(2rem,6vh)] text-[#50300d]" aria-labelledby="profile-title">
            <div className="overflow-hidden rounded-[1.35rem] border border-[#8f5a20]/25 bg-[#f8f4ee] shadow-[0_18px_42px_rgb(80_48_13_/_13%)] transition-all">
                <div
                    className="atlas-header relative flex min-h-[19rem] items-end bg-[#5a392b] px-6 py-7 text-[#ffead4] sm:min-h-[24rem] sm:px-9"
                    style={{ backgroundImage: `linear-gradient(90deg, rgb(30 24 21 / 78%), rgb(30 24 21 / 20%)), linear-gradient(0deg, rgb(30 24 21 / 40%), transparent 65%), url(https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1800&q=85)`, backgroundSize: "cover", backgroundPosition: "center 55%" }}
                >
                    <div className="relative z-10 flex w-full flex-wrap items-end justify-between gap-6">
                        <div>
                            <p className="m-0 font-[Adamina] text-[0.7rem] uppercase tracking-[0.24em] text-[#f6d7b5]">@{profile.name.toLowerCase().trim().replace(/\\s+/g, ".")}</p>
                            <h1 id="profile-title" className="mt-3 font-[Cormorant_Garamond] text-[clamp(2.8rem,7vw,5.4rem)] leading-[0.9] text-[#fff4e7]">
                                {profile.name}
                            </h1>
                            <p className="mt-3 max-w-[42rem] font-[Cormorant_Garamond] text-[1.15rem] leading-[1.35] text-[#f7dfca]">
                                {profile.currentFocus} · {profile.travelStyle}
                            </p>
                        </div>
                        <button type="button" onClick={openEditor} className="absolute right-0 top-0 rounded-full border border-white/60 bg-black/20 px-5 py-2.5 font-[Adamina] text-sm text-white backdrop-blur-sm transition hover:bg-black/40">Edit profile</button>
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#f6d7b5]/70 bg-[#cf8d45] font-[Adamina] text-[1.5rem] text-[#fff4e7] sm:h-24 sm:w-24">
                            {profile.avatar ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" /> : initials}
                        </div>
                    </div>
                </div>

                <div className="grid gap-7 px-4 py-5 sm:px-7 sm:py-7 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <div>
                        <div className="rounded-[1rem] border border-[#cf8d45]/35 bg-[#fff4e7]/52 p-5 shadow-[inset_0_0_24px_rgb(143_90_32_/_8%)]">
                            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                                <div className="rounded-[0.8rem] border border-[#cf8d45]/25 bg-[#ffead4]/45 px-4 py-3">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#7a3f00]">Traveler name</p>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.25rem] text-[#50300d]">{profile.name}</p>
                                </div>
                                <div className="rounded-[0.8rem] border border-[#cf8d45]/25 bg-[#ffead4]/45 px-4 py-3">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#7a3f00]">Email address</p>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.25rem] text-[#50300d]">{profile.email}</p>
                                </div>
                                <div className="rounded-[0.8rem] border border-[#cf8d45]/25 bg-[#ffead4]/45 px-4 py-3">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#7a3f00]">Favorite travel style</p>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.25rem] text-[#50300d]">{profile.travelStyle}</p>
                                </div>
                                <div className="rounded-[0.8rem] border border-[#cf8d45]/25 bg-[#ffead4]/45 px-4 py-3">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#7a3f00]">Current focus</p>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.25rem] text-[#50300d]">{profile.currentFocus}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-7 rounded-[1rem] border border-[#cf8d45]/35 bg-[#fff4e7]/72 p-5 shadow-[inset_0_0_16px_rgb(143_90_32_/_7%)]">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">User record</p>
                                    <h2 className="mt-2 font-[Adamina] text-[1.35rem] text-[#50300d]">ERD-backed account data</h2>
                                </div>
                                <p className="font-[Cormorant_Garamond] text-[1rem] text-[#7a3f00]">Stored locally until Supabase sync is added</p>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="rounded-[0.8rem] border border-[#cf8d45]/25 bg-[#ffead4]/45 px-4 py-3">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#7a3f00]">User ID</p>
                                    <p className="mt-1 break-all font-[Cormorant_Garamond] text-[1.05rem] text-[#50300d]">{getStoredUserProfile()?.id || "Not set yet"}</p>
                                </div>
                                <div className="rounded-[0.8rem] border border-[#cf8d45]/25 bg-[#ffead4]/45 px-4 py-3">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#7a3f00]">Subscription tier</p>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.05rem] text-[#50300d]">{getStoredUserProfile()?.subscriptionTier || "free"}</p>
                                </div>
                                <div className="rounded-[0.8rem] border border-[#cf8d45]/25 bg-[#ffead4]/45 px-4 py-3">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#7a3f00]">Subscription status</p>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.05rem] text-[#50300d]">{getStoredUserProfile()?.subscriptionStatus || "inactive"}</p>
                                </div>
                                <div className="rounded-[0.8rem] border border-[#cf8d45]/25 bg-[#ffead4]/45 px-4 py-3">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#7a3f00]">Profile created</p>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.05rem] text-[#50300d]">{getStoredUserProfile()?.createdAt ? new Date(getStoredUserProfile()!.createdAt).toLocaleDateString() : "Not set yet"}</p>
                                </div>
                                <div className="rounded-[0.8rem] border border-[#cf8d45]/25 bg-[#ffead4]/45 px-4 py-3">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#7a3f00]">Auth provider</p>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.05rem] text-[#50300d]">{getStoredUserProfile()?.authProvider || "email"}</p>
                                </div>
                                <div className="rounded-[0.8rem] border border-[#cf8d45]/25 bg-[#ffead4]/45 px-4 py-3">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#7a3f00]">Lifetime beta</p>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.05rem] text-[#50300d]">{getStoredUserProfile()?.isLifetimeFree ? "Yes" : "No"}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-7 grid gap-3 sm:grid-cols-3">
                            {profileStats.map((stat) => (
                                <article key={stat.label} className="rounded-[0.9rem] border border-[#cf8d45]/35 bg-[#fff4e7]/72 p-4 shadow-[inset_0_0_16px_rgb(143_90_32_/_7%)] interactive-transition hover:shadow-[inset_0_0_16px_rgb(143_90_32_/_12%),0_4px_12px_rgb(122_63_0_/_15%)] hover:-translate-y-0.5">
                                    <p className="font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">{stat.label}</p>
                                    <p className="mt-2 font-[Adamina] text-[2rem] leading-none text-[#50300d]">{stat.value}</p>
                                </article>
                            ))}
                        </div>
                    </div>

                                    <aside className="flex flex-col gap-3 rounded-[1rem] p-4">
                                        {/* Subscription badge (reads from localStorage key `subscriptionStatus`) */}
                                            <SubscriptionStatus />

                                        <Link
                                            to="/settings"
                                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#7a3f00] bg-[#5a392b] text-[#ffead4] transition hover:bg-[#7a3f00]"
                                            aria-label="Settings"
                                            title="Settings"
                                        >
                                            <Settings size={20} />
                                        </Link>

                                        <Link
                                            to="/help-center"
                                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#cf8d45] bg-[#fff7ee] text-[#50300d] transition hover:bg-[#f6dfc1]"
                                            aria-label="Help center"
                                            title="Help center"
                                        >
                                            <HelpCircle size={20} />
                                        </Link>

                                        <button
                                            type="button"
                                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#7a3f00] bg-[#5a392b] text-[#ffead4] transition hover:bg-[#7a3f00]"
                                            onClick={openEditor}
                                            aria-label="Edit profile"
                                            title="Edit profile"
                                        >
                                            <Edit size={18} />
                                        </button>

                                        <button
                                            type="button"
                                            className="rounded-full border border-[#cf8d45] bg-[#cf8d45] px-4 py-2.5 font-[Adamina] text-[0.92rem] text-[#fff4e7] transition hover:-translate-y-px hover:bg-[#b97731]"
                                            onClick={handleLogout}
                                        >
                                            Log out
                                        </button>
                                        {/* Admin seeding moved to /admin-seed (protected) */}
                    </aside>
                </div>
                <div className="grid gap-6 px-4 pb-6 sm:px-7 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <section className="rounded-[1rem] border border-[#50300d]/15 bg-white p-5 sm:p-7" aria-label="Recent journeys">
                        <div className="mb-4 flex items-end justify-between gap-3">
                            <div><p className="font-[Adamina] text-[0.68rem] uppercase tracking-[0.24em] text-[#936d58]">Recently remembered</p><h2 className="mt-1 font-[Cormorant_Garamond] text-3xl text-[#50300d]">Latest journeys</h2></div>
                            <Link to="/gallery" className="font-[Cormorant_Garamond] text-base text-[#936d58] hover:text-[#50300d]">View gallery →</Link>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                            {[
                                { city: "Florence", country: "Italy", date: "A city to wander", image: "photo-1543429257-37a54b3f4c4d" },
                                { city: "Kyoto", country: "Japan", date: "Quiet mornings", image: "photo-1493976040374-85c8e12f0c0e" },
                                { city: "Lisbon", country: "Portugal", date: "Down every lane", image: "photo-1555881400-74d7acaacd8b" }
                            ].map((journey) => <Link key={journey.city} to="/gallery" className="group relative flex min-h-52 items-end overflow-hidden rounded-xl bg-cover bg-center p-4 text-white" style={{ backgroundImage: `linear-gradient(0deg, rgb(20 16 14 / 78%), transparent 72%), url(https://images.unsplash.com/${journey.image}?auto=format&fit=crop&w=700&q=80)` }}><div className="transition group-hover:translate-y-[-2px]"><p className="font-[Adamina] text-[0.6rem] uppercase tracking-[0.18em] text-[#f3d8bd]">{journey.date}</p><h3 className="font-[Cormorant_Garamond] text-3xl leading-tight">{journey.city}</h3><p className="font-[Cormorant_Garamond]">{journey.country}</p></div></Link>)}
                        </div>
                    </section>
                    <blockquote className="relative flex flex-col justify-center rounded-[1rem] bg-[#5a392b] p-6 text-[#fff4e7] sm:p-7"><span aria-hidden="true" className="absolute right-4 top-0 font-[Cormorant_Garamond] text-8xl leading-none text-white/10">“</span><p className="relative font-[Cormorant_Garamond] text-2xl leading-tight">The real voyage of discovery consists not in seeking new landscapes, but in having new eyes.</p><cite className="mt-4 font-[Adamina] text-[0.62rem] not-italic uppercase tracking-[0.2em] text-[#e0c3aa]">Marcel Proust</cite></blockquote>
                </div>
            </div>

            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#50300d]/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
                    <div className="max-h-[92svh] w-full max-w-[820px] overflow-y-auto rounded-[1.2rem] border border-[#8f5a20]/35 bg-[#ffead4] p-5 shadow-[0_24px_54px_rgb(35_18_8_/_35%)] sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="font-[Adamina] text-[0.68rem] uppercase tracking-[0.22em] text-[#7a3f00]">Profile settings</p>
                                <h2 id="edit-profile-title" className="mt-2 font-[Adamina] text-[2rem] text-[#50300d]">Edit profile</h2>
                            </div>
                            <button type="button" className="rounded-full border border-[#cf8d45] bg-[#fff7ee] px-3 py-1.5 font-[Adamina] text-[#50300d]" onClick={() => setIsEditing(false)}>
                                Close
                            </button>
                        </div>

                        <div className="mt-6 grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
                            <div>
                                <div className="mx-auto flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border border-[#cf8d45] bg-[#cf8d45]">
                                    <img src={draftProfile.avatar} alt="Selected avatar preview" className="h-full w-full object-cover" />
                                </div>
                                <p className="mt-4 font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">Choose avatar</p>
                                <div className="mt-3 grid grid-cols-3 gap-2">
                                    {avatarOptions.map((avatar) => (
                                        <button
                                            key={avatar.id}
                                            type="button"
                                            className={`overflow-hidden rounded-full border bg-[#fff4e7] p-1 interactive-transition hover:-translate-y-px hover:shadow-[0_4px_12px_rgb(122_63_0_/_20%)] ${draftProfile.avatar === avatar.src ? "border-[#7a3f00] ring-2 ring-[#cf8d45] shadow-[0_0_8px_rgb(199_141_69_/_30%)]" : "border-[#cf8d45]/45 hover:border-[#cf8d45]/70"}`}
                                            onClick={() => updateDraft("avatar", avatar.src)}
                                            aria-label={`Use ${avatar.label} avatar`}
                                        >
                                            <img src={avatar.src} alt="" className="h-14 w-14 rounded-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                                <label className="mt-4 block rounded-[0.8rem] border border-dashed border-[#cf8d45] bg-[#fff7ee]/70 px-4 py-3 text-center font-[Adamina] text-[0.9rem] text-[#50300d]">
                                    Upload your own
                                    <input type="file" accept="image/*,.heic,.heif" className="sr-only" onChange={handleAvatarUpload} />
                                </label>
                            </div>

                            <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); saveProfile(); }}>
                                <label className="block">
                                    <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">Name</span>
                                    <input value={draftProfile.name} onChange={(event) => updateDraft("name", event.target.value)} className="w-full rounded-[0.7rem] border border-[#cf8d45]/55 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1.1rem] text-[#50300d] outline-none focus:border-[#7a3f00] focus:ring-2 focus:ring-[#cf8d45]/35" />
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">Email</span>
                                    <input type="email" value={draftProfile.email} onChange={(event) => updateDraft("email", event.target.value)} className="w-full rounded-[0.7rem] border border-[#cf8d45]/55 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1.1rem] text-[#50300d] outline-none interactive-transition hover:border-[#cf8d45]/70 focus:border-[#7a3f00] focus:ring-2 focus:ring-[#cf8d45]/35 focus:shadow-[0_0_8px_rgb(199_141_69_/_20%)]" />
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">Favorite travel style</span>
                                    <input value={draftProfile.travelStyle} onChange={(event) => updateDraft("travelStyle", event.target.value)} className="w-full rounded-[0.7rem] border border-[#cf8d45]/55 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1.1rem] text-[#50300d] outline-none interactive-transition hover:border-[#cf8d45]/70 focus:border-[#7a3f00] focus:ring-2 focus:ring-[#cf8d45]/35 focus:shadow-[0_0_8px_rgb(199_141_69_/_20%)]" />
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">Current focus</span>
                                    <input value={draftProfile.currentFocus} onChange={(event) => updateDraft("currentFocus", event.target.value)} className="w-full rounded-[0.7rem] border border-[#cf8d45]/55 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1.1rem] text-[#50300d] outline-none interactive-transition hover:border-[#cf8d45]/70 focus:border-[#7a3f00] focus:ring-2 focus:ring-[#cf8d45]/35 focus:shadow-[0_0_8px_rgb(199_141_69_/_20%)]" />
                                </label>
                                <div className="flex flex-wrap justify-end gap-3 pt-2">
                                    <button type="button" className="rounded-full border border-[#cf8d45] bg-[#fff7ee] px-5 py-2.5 font-[Adamina] text-[0.92rem] text-[#50300d] interactive-transition hover:-translate-y-px hover:bg-[#f6dfc1] hover:shadow-[0_4px_12px_rgb(122_63_0_/_15%)] active:translate-y-px" onClick={() => setIsEditing(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="rounded-full border border-[#7a3f00] bg-[#5a392b] px-5 py-2.5 font-[Adamina] text-[0.92rem] text-[#ffead4] interactive-transition hover:-translate-y-px hover:bg-[#7a3f00] hover:shadow-[0_4px_12px_rgb(122_63_0_/_20%)] active:translate-y-px">
                                        Save profile
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    style={{ bottom: `${scrollBtnBottom}px` }}
                    className="fixed right-[max(2rem,5%)] flex h-[clamp(2.5rem,8vw,3rem)] w-[clamp(2.5rem,8vw,3rem)] items-center justify-center rounded-full border border-[#cf8d45] bg-[#5a392b] text-[#ffead4] shadow-[0_8px_24px_rgb(122_63_0_/_30%)] transition hover:bg-[#7a3f00] hover:-translate-y-1"
                    aria-label="Scroll to top"
                    title="Back to top"
                >
                    <span className="text-xl">↑</span>
                </button>
            )}
        </section>
    );
}

export default Profile;
