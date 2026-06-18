import { useMemo, useState, useEffect, useRef } from "react";
import { Settings, HelpCircle, Edit, Loader2 } from "lucide-react";
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
import paperBackground from "../assets/wrinkled-paper.png";
import { supabase } from "../lib/supabase/client";
import { clearStoredUserProfile, getStoredUserProfile, saveStoredUserProfile, createStoredUserProfileFromSession } from "../types/user";
import type { User } from "@supabase/supabase-js";

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
    const [user, setUser] = useState<User | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [profile, setProfile] = useState<ProfileForm>(() => getCachedProfile());
    const [draftProfile, setDraftProfile] = useState<ProfileForm>(() => getCachedProfile());
    const [isEditing, setIsEditing] = useState(false);
    const { showScrollTop, scrollToTop } = useScrollToTop();
    const [scrollBtnBottom, setScrollBtnBottom] = useState(window.innerHeight * 0.02);
    const profileRef = useRef(profile);

    useEffect(() => {
        profileRef.current = profile;
    }, [profile, profileRef]);

    useEffect(() => {
        async function syncUser() {
            const { data: { user: sbUser } } = await supabase.auth.getUser();
            
            if (sbUser) {
                setUser(sbUser);
                const metadata = sbUser.user_metadata;
                const currentProfile = profileRef.current;
                
                const syncedProfile: ProfileForm = {
                    name: metadata.username || metadata.full_name || sbUser.email?.split("@")[0] || currentProfile.name,
                    email: sbUser.email || currentProfile.email,
                    travelStyle: metadata.travelStyle || currentProfile.travelStyle,
                    currentFocus: metadata.currentFocus || currentProfile.currentFocus,
                    avatar: metadata.avatar_url || metadata.avatar || currentProfile.avatar
                };

                setProfile(syncedProfile);
                setDraftProfile(syncedProfile);
                
                // Sync the helper storage
                saveStoredUserProfile({
                    ...createStoredUserProfileFromSession(sbUser),
                    travelStyle: syncedProfile.travelStyle,
                    currentFocus: syncedProfile.currentFocus
                });
            } else if (!getStoredUserProfile()) {
                navigate("/welcome", { replace: true });
            }
        }
        void syncUser();

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
    }, [navigate, profileRef]);

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

    const saveProfile = async () => {
        setIsSaving(true);
        try {
            const { data, error } = await supabase.auth.updateUser({
                data: {
                    username: draftProfile.name.trim(),
                    travelStyle: draftProfile.travelStyle.trim(),
                    currentFocus: draftProfile.currentFocus.trim(),
                    avatar_url: draftProfile.avatar
                }
            });

            if (error) throw error;

            if (data.user) {
                setUser(data.user);
                const metadata = data.user.user_metadata;
                const updated: ProfileForm = {
                    name: metadata.username || data.user.email?.split("@")[0] || "Traveler",
                    email: data.user.email || "",
                    travelStyle: metadata.travelStyle,
                    currentFocus: metadata.currentFocus,
                    avatar: metadata.avatar_url
                };
                setProfile(updated);
                
                // Sync local caches
                saveStoredUserProfile({
                    ...createStoredUserProfileFromSession(data.user),
                    travelStyle: updated.travelStyle,
                    currentFocus: updated.currentFocus
                });
                localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(updated));
            }
            setIsEditing(false);
        } catch (err) {
            console.error("Failed to save profile to Supabase:", err);
        } finally {
            setIsSaving(false);
        }
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
            <div
                className="overflow-hidden rounded-[1.35rem] border border-[#8f5a20]/35 bg-[#ffead4]/95 shadow-[0_18px_42px_rgb(80_48_13_/_20%),inset_0_0_0_1px_rgb(255_244_231_/_55%)] transition-all"
                style={{ backgroundImage: `linear-gradient(rgb(255 234 212 / 0.9), rgb(255 234 212 / 0.9)), url(${paperBackground})`, backgroundSize: "cover" }}
            >
                <div
                    className="relative min-h-[11rem] bg-[#5a392b] px-6 py-7 text-[#ffead4] sm:px-9"
                    style={{ backgroundImage: `linear-gradient(rgb(90 57 43 / 0.9), rgb(90 57 43 / 0.9)), url(${paperBackground})`, backgroundSize: "cover" }}
                >
                    <div className="relative flex flex-wrap items-start justify-between gap-6">
                        <div>
                            <p className="m-0 font-[Adamina] text-[0.7rem] uppercase tracking-[0.24em] text-[#f6d7b5]">Travel profile</p>
                            <h1 id="profile-title" className="mt-3 font-[Adamina] text-[clamp(2.2rem,5vw,3.8rem)] leading-none text-[#fff4e7]">
                                {profile.name}
                            </h1>
                            <p className="mt-4 max-w-[42rem] font-[Cormorant_Garamond] text-[1.25rem] leading-[1.35] text-[#f7dfca]">
                                A personal overview for the places you have visited, the routes you are planning, and the memories you keep coming back to.
                            </p>
                        </div>
                        <div className="flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#f6d7b5]/70 bg-[#cf8d45] font-[Adamina] text-[1.9rem] text-[#fff4e7]">
                            {profile.avatar ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" /> : initials}
                        </div>
                    </div>
                </div>

                <div className="grid gap-7 px-6 py-7 sm:px-9 lg:grid-cols-[minmax(0,1fr)_20rem]">
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
                                    <p className="mt-1 break-all font-[Cormorant_Garamond] text-[1.05rem] text-[#50300d]">{user?.id || getStoredUserProfile()?.id || "Not set yet"}</p>
                                </div>
                                <div className="rounded-[0.8rem] border border-[#cf8d45]/25 bg-[#ffead4]/45 px-4 py-3">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#7a3f00]">Subscription tier</p>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.05rem] text-[#50300d]">{user?.app_metadata?.subscription_tier || getStoredUserProfile()?.subscriptionTier || "free"}</p>
                                </div>
                                <div className="rounded-[0.8rem] border border-[#cf8d45]/25 bg-[#ffead4]/45 px-4 py-3">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#7a3f00]">Subscription status</p>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.05rem] text-[#50300d]">{user?.app_metadata?.subscription_status || getStoredUserProfile()?.subscriptionStatus || "inactive"}</p>
                                </div>
                                <div className="rounded-[0.8rem] border border-[#cf8d45]/25 bg-[#ffead4]/45 px-4 py-3">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#7a3f00]">Profile created</p>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.05rem] text-[#50300d]">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Not set yet"}</p>
                                </div>
                                <div className="rounded-[0.8rem] border border-[#cf8d45]/25 bg-[#ffead4]/45 px-4 py-3">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#7a3f00]">Auth provider</p>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.05rem] text-[#50300d]">{user?.app_metadata?.provider || getStoredUserProfile()?.authProvider || "email"}</p>
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
                                    <button type="submit" disabled={isSaving} className="rounded-full border border-[#7a3f00] bg-[#5a392b] px-5 py-2.5 font-[Adamina] text-[0.92rem] text-[#ffead4] interactive-transition hover:-translate-y-px hover:bg-[#7a3f00] hover:shadow-[0_4px_12px_rgb(122_63_0_/_20%)] active:translate-y-px flex items-center gap-2">
                                        {isSaving && <Loader2 size={16} className="animate-spin" />}
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
