import { useMemo, useState, useEffect } from "react";
import { Settings, HelpCircle } from "lucide-react";
import type { ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useScrollToTop } from "../hooks/useScrollToTop";
import compassAvatar from "../assets/avatars/compass.png";
// import SubscriptionStatus from "../components/SubscriptionStatus";
import globeAvatar from "../assets/avatars/globe.png";
import mountainsAvatar from "../assets/avatars/mountains.png";
import passportAvatar from "../assets/avatars/passport.png";
import postcardAvatar from "../assets/avatars/postcard.png";
import suitcaseAvatar from "../assets/avatars/suitcase.png";
import { supabase } from "../lib/supabase/client";
import { clearStoredUserProfile } from "../types/user";
import { UnsplashAttribution } from "../components/UnsplashAttribution";
import { requestUnsplashDownload, useUnsplashPhoto } from "../lib/unsplash";
import { loadCloudUserProfile, loadCloudRecentTrips, saveCloudUserProfile, uploadCloudAvatar, type CloudUserProfile, type CloudRecentTrip } from "../infrastructure/user/SupabaseUserProfileRepository";
import type { CountryStatus } from "../domain/country/Country";

export type ProfileProps = { countryStatuses: Record<string, CountryStatus> };

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

const defaultProfile: ProfileForm = {
    name: "",
    email: "",
    travelStyle: "",
    currentFocus: "",
    avatar: ""
};

const AUTH_CACHE_KEY = "tripjournal:auth:v1";
const PROFILE_UPDATED_EVENT = "tripjournal:profile-updated";

export function Profile({ countryStatuses }: ProfileProps) {
    const navigate = useNavigate();
    const heroPhoto = useUnsplashPhoto("photo-1519501025264-65ba15a82390");
    const [profile, setProfile] = useState<ProfileForm>(defaultProfile);
    const [draftProfile, setDraftProfile] = useState<ProfileForm>(defaultProfile);
    const [cloudProfile, setCloudProfile] = useState<CloudUserProfile | null>(null);
    const [recentTrips, setRecentTrips] = useState<CloudRecentTrip[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [pendingAvatar, setPendingAvatar] = useState<File | null>(null);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { showScrollTop, scrollToTop } = useScrollToTop();
    const [scrollBtnBottom, setScrollBtnBottom] = useState(window.innerHeight * 0.02);

    useEffect(() => {
        let isMounted = true;

        void Promise.all([loadCloudUserProfile(), loadCloudRecentTrips()])
            .then(([cloudProfileResult, trips]) => {
                if (!isMounted) {
                    return;
                }

                if (cloudProfileResult) {
                    const nextProfile: ProfileForm = {
                        name: cloudProfileResult.username || "",
                        email: cloudProfileResult.email,
                        travelStyle: cloudProfileResult.travelStyle,
                        currentFocus: cloudProfileResult.currentFocus,
                        avatar: cloudProfileResult.avatarUrl || ""
                    };
                    setCloudProfile(cloudProfileResult);
                    setProfile(nextProfile);
                    setDraftProfile(nextProfile);
                }
                setRecentTrips(trips ?? []);
                setProfileError(null);
            })
            .catch((error: unknown) => {
                if (isMounted) {
                    setProfileError(error instanceof Error ? error.message : "Unable to load your profile.");
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

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
            .join("");
    }, [profile.name]);

    const openEditor = () => {
        setDraftProfile(profile);
        setPendingAvatar(null);
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

        if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 5 * 1024 * 1024) {
            setProfileError("Choose a JPEG, PNG, WebP, or GIF image up to 5 MB.");
            event.target.value = "";
            return;
        }
        setPendingAvatar(file);
        updateDraft("avatar", URL.createObjectURL(file));
    };

    const saveProfile = async () => {
        setIsSaving(true);
        setProfileError(null);

        try {
            if (!cloudProfile) throw new Error("Sign in to save profile changes.");
            let avatarUrl = draftProfile.avatar || null;
            if (pendingAvatar) {
                avatarUrl = await uploadCloudAvatar(cloudProfile.id, pendingAvatar);
            } else if (avatarUrl?.startsWith("data:")) {
                const response = await fetch(avatarUrl);
                const blob = await response.blob();
                const extension = blob.type.split("/")[1] || "png";
                avatarUrl = await uploadCloudAvatar(cloudProfile.id, new File([blob], `avatar.${extension}`, { type: blob.type }));
            }
            const savedProfile: CloudUserProfile = {
                ...cloudProfile,
                username: draftProfile.name.trim() || null,
                avatarUrl,
                travelStyle: draftProfile.travelStyle,
                currentFocus: draftProfile.currentFocus
            };
            await saveCloudUserProfile(savedProfile);
            setCloudProfile(savedProfile);

            const savedDraft = { ...draftProfile, avatar: avatarUrl ?? "" };
            setProfile(savedDraft);
            setDraftProfile(savedDraft);
            setPendingAvatar(null);
            window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
            setIsEditing(false);
        } catch (error: unknown) {
            setProfileError(error instanceof Error ? error.message : "Unable to save your profile.");
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
            <div className="overflow-hidden rounded-[1.35rem] border border-[#8f5a20]/25 bg-[#f8f4ee]/85 shadow-[0_18px_42px_rgb(80_48_13_/_13%)] transition-all">
                <div
                    className="atlas-header relative flex min-h-[19rem] items-end bg-[#5a392b] px-6 py-7 text-[#ffead4] sm:min-h-[24rem] sm:px-9"
                    onClick={() => heroPhoto && requestUnsplashDownload(heroPhoto)}
                    style={{ backgroundImage: `linear-gradient(90deg, rgb(30 24 21 / 78%), rgb(30 24 21 / 20%)), linear-gradient(0deg, rgb(30 24 21 / 40%), transparent 65%), url(${heroPhoto?.urls.regular ?? "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1800&q=85"})`, backgroundSize: "cover", backgroundPosition: "center 55%" }}
                >
                    <div className="relative z-10 flex w-full flex-wrap items-end justify-between gap-6">
                        <div>
                            <p className="m-0 font-[Adamina] text-[0.7rem] uppercase tracking-[0.24em] text-[#f6d7b5]">@{profile.name.toLowerCase().trim().replace(/\\s+/g, ".")}</p>
                            <h1 id="profile-title" className="mt-3 font-[Cormorant_Garamond] text-[clamp(2.8rem,7vw,5.4rem)] leading-[0.9] text-[#fff4e7]">
                                {profile.name}
                            </h1>
                            <p className="mt-3 max-w-[42rem] font-[Cormorant_Garamond] text-[1.15rem] leading-[1.35] text-[#f7dfca]">
                                {[profile.currentFocus, profile.travelStyle].filter(Boolean).join(" · ")}
                            </p>
                            <UnsplashAttribution photo={heroPhoto} />
                        </div>
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                openEditor();
                            }}
                            className="atlas-header-action mt-1 w-full shrink-0 sm:w-auto"
                        >
                            Edit profile
                        </button>
                    </div>
                </div>

                <div className="grid gap-7 px-4 py-5 sm:px-7 sm:py-7 lg:grid-cols-[minmax(0,1fr)_20rem] bg-[#5a392b]/95">
                    <div>
                        <div className="flex items-stretch rounded-[1rem] border border-[#eab681]/35 bg-[#ffead41f] p-5 shadow-[inset_0_1px_0_#ffffff2b,0_10px_28px_rgb(0_0_0_/_30%)] interactive-transition hover:shadow-[inset_0_1px_0_#ffffff2b,0_14px_34px_rgb(0_0_0_/_40%)]">
                            <div className="flex items-center justify-center mr-6">
                                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border border-[#f6d7b5]/70 bg-[#cf8d45] font-[Adamina] text-[1.5rem] text-[#fff4e7]"> {profile.avatar ? (
                                    <img src={profile.avatar} alt="" className="h-full w-full object-cover" />) : (initials)}
                                </div>
                            </div>
                            <div className="grid flex-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                                <div className="rounded-[0.8rem] border border-[#eab681]/20 bg-[#ffead40d] px-4 py-3">
                                <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#f6d7b5]">Traveler name</p>
                                <p className="mt-1 font-[Cormorant_Garamond] text-[1.25rem] text-[#fff4e7]">{profile.name}</p>
                                </div>

                                <div className="rounded-[0.8rem] border border-[#eab681]/20 bg-[#ffead40d] px-4 py-3">
                                <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#f6d7b5]">Email address</p>
                                <p className="mt-1 font-[Cormorant_Garamond] text-[1.25rem] text-[#fff4e7]">{profile.email}</p>
                                </div>

                                <div className="sm:col-span-2 rounded-[0.8rem] border border-[#eab681]/20 bg-[#ffead40d] px-4 py-3">
                                <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#f6d7b5]">Favorite travel style</p>
                                <p className="mt-1 font-[Cormorant_Garamond] text-[1.25rem] text-[#fff4e7]">{profile.travelStyle}</p>
                                </div>
                            </div>

                        </div>


                        <div className="mt-7 rounded-[1rem] border border-[#eab681]/35 bg-[#ffead41f] p-5 shadow-[inset_0_1px_0_#ffffff2b,0_10px_28px_rgb(0_0_0_/_30%)] interactive-transition hover:shadow-[inset_0_1px_0_#ffffff2b,0_14px_34px_rgb(0_0_0_/_40%)]">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#f6d7b5]">User record</p>
                                    <h2 className="mt-2 font-[Adamina] text-[1.35rem] text-[#fff4e7]">Account details</h2>
                                </div>
                                <p className="font-[Cormorant_Garamond] text-[1rem] text-[#f7dfca]">All information about your account</p>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                                {/*
                                <div className="rounded-[0.8rem] border border-[#eab681]/20 bg-[#ffead40d] px-4 py-3">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#f6d7b5]">Subscription tier</p>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.05rem] text-[#fff4e7]">{getStoredUserProfile()?.subscriptionTier || "free"}</p>
                                </div>
                                <div className="rounded-[0.8rem] border border-[#eab681]/20 bg-[#ffead40d] px-4 py-3">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#f6d7b5]">Subscription status</p>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.05rem] text-[#fff4e7]">{getStoredUserProfile()?.subscriptionStatus || "inactive"}</p>
                                </div>
                                */}
                                <div className="rounded-[0.8rem] border border-[#eab681]/20 bg-[#ffead40d] px-4 py-3">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#f6d7b5]">Profile created</p>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.05rem] text-[#fff4e7]">{cloudProfile?.createdAt ? new Date(cloudProfile.createdAt).toLocaleDateString() : "—"}</p>
                                </div>
                                <div className="rounded-[0.8rem] border border-[#eab681]/20 bg-[#ffead40d] px-4 py-3">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#f6d7b5]">Login method</p>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.05rem] text-[#fff4e7]">{cloudProfile?.authProvider ?? "—"}</p>
                                </div>
                            </div>
                        </div>

                        {profileError && (
                            <p className="mt-5 rounded-[0.7rem] border border-[#b16a55]/45 bg-[#fff4e7] px-4 py-3 font-[Cormorant_Garamond] text-[#8d3324]">
                                {profileError}
                            </p>
                        )}

                        <div className="mt-7 grid gap-3 sm:grid-cols-3">
                            {[
                                { label: "Visited", value: Object.values(countryStatuses).filter((status) => status === "visited").length },
                                { label: "Wishlist", value: Object.values(countryStatuses).filter((status) => status === "want-to-go").length },
                                { label: "Returns", value: Object.values(countryStatuses).filter((status) => status === "want-to-visit-again").length }
                            ].map((stat) => (
                                <article key={stat.label} className="rounded-[1.2rem] border border-[#eab681]/35 bg-[#ffead41f] p-4 shadow-[inset_0_1px_0_#ffffff2b,0_10px_28px_rgb(0_0_0_/_30%)] interactive-transition hover:shadow-[inset_0_1px_0_#ffffff2b,0_14px_34px_rgb(0_0_0_/_40%)] hover:-translate-y-0.5">
                                    <p className="font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#f6d7b5]">{stat.label}</p>
                                    <p className="mt-2 font-[Adamina] text-[2rem] leading-none text-[#fff4e7]">{stat.value}</p>
                                </article>
                            ))}
                        </div>

                        <section className="mt-7 rounded-[1rem] border border-[#cf8d45]/30 bg-white p-5 shadow-[0_14px_34px_rgb(0_0_0_/_30%)] sm:p-7" aria-label="Recent journeys">
                            <div className="mb-4 flex items-end justify-between gap-3">
                                <div>
                                    <p className="font-[Adamina] text-[0.68rem] uppercase tracking-[0.24em] text-[#936d58]">Recently remembered</p>
                                    <h2 className="mt-1 font-[Cormorant_Garamond] text-3xl text-[#50300d]">Latest journeys</h2>
                                </div>
                                <Link to="/gallery" className="font-[Cormorant_Garamond] text-base text-[#936d58] hover:text-[#50300d]">View gallery →</Link>
                            </div>
                            {recentTrips.length ? <div className="grid gap-3 sm:grid-cols-2">{recentTrips.map((trip) => <article key={trip.id} className="rounded-[0.8rem] border border-[#cf8d45]/35 bg-[#fffaf4] px-4 py-3"><h3 className="font-[Adamina] text-[#50300d]">{trip.title}</h3><p className="mt-1 font-[Cormorant_Garamond] text-[#6a4630]">{trip.status}{trip.startDate ? ` · ${trip.startDate}` : ""}{trip.endDate ? ` – ${trip.endDate}` : ""}</p></article>)}</div> : <div className="rounded-[0.8rem] border border-dashed border-[#cf8d45]/40 bg-[#fffaf4] px-4 py-6 text-center font-[Cormorant_Garamond] text-[1.1rem] text-[#6a4630]">No journeys saved yet.</div>}
                        </section>
                    </div>


                    <aside className="flex flex-col gap-3 rounded-[1rem]">
                        {/*
                        <SubscriptionStatus />
                        */}

                        <div className="mt-3 flex flex-col gap-2">
                            <Link
                                to="/settings#account"
                                className="flex items-center gap-3 rounded-full border border-[#eab681]/35 bg-[#ffead41a] px-4 py-2.5 font-[Cormorant_Garamond] text-[1.05rem] text-[#fff4e7] shadow-[inset_0_1px_0_#ffffff2b] interactive-transition hover:-translate-y-px hover:border-[#eab681]/60 hover:bg-[#ffead426] hover:shadow-[inset_0_1px_0_#ffffff2b,0_10px_22px_rgb(0_0_0_/_30%)]"
                            >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#cf8d45] text-[#fff4e7] shadow-[0_2px_8px_rgb(0_0_0_/_35%)]">
                                    <Settings size={16} />
                                </span>
                                Settings
                            </Link>

                            <Link
                                to="/help-center"
                                className="flex items-center gap-3 rounded-full border border-[#eab681]/35 bg-[#ffead41a] px-4 py-2.5 font-[Cormorant_Garamond] text-[1.05rem] text-[#fff4e7] shadow-[inset_0_1px_0_#ffffff2b] interactive-transition hover:-translate-y-px hover:border-[#eab681]/60 hover:bg-[#ffead426] hover:shadow-[inset_0_1px_0_#ffffff2b,0_10px_22px_rgb(0_0_0_/_30%)]"
                            >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eab681] text-[#50300d] shadow-[0_2px_8px_rgb(0_0_0_/_35%)]">
                                    <HelpCircle size={16} />
                                </span>
                                Help center
                            </Link>

                            <button
                                type="button"
                                className="mt-1 flex items-center justify-center rounded-full border border-[#cf8d45] bg-[#cf8d45] px-4 py-2.5 font-[Adamina] text-[0.92rem] text-[#fff4e7] shadow-[0_8px_20px_rgb(0_0_0_/_25%)] interactive-transition hover:-translate-y-px hover:bg-[#b97731] hover:shadow-[0_12px_26px_rgb(0_0_0_/_32%)]"
                                onClick={handleLogout}
                            >
                                Log out
                            </button>
                        </div>
                        <blockquote className="relative flex flex-col justify-center rounded-[1rem] border border-[#eab681]/35 bg-[#5a392b] p-6 text-[#fff4e7] shadow-[0_18px_44px_rgb(0_0_0_/_45%)] sm:p-7">
                            <span aria-hidden="true" className="absolute right-4 top-0 font-[Cormorant_Garamond] text-9xl leading-none text-[#eab681]/20">“</span>
                            <p className="relative font-[Cormorant_Garamond] text-2xl leading-tight">The real voyage of discovery consists not in seeking new landscapes, but in having new eyes.</p>
                            <cite className="mt-4 font-[Adamina] text-[0.62rem] not-italic uppercase tracking-[0.2em] text-[#e0c3aa]">Marcel Proust</cite>
                        </blockquote>
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
                                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={handleAvatarUpload} />
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
                                    <span className="mb-1.5 mt-4 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00] px-4 py-3">Favorite travel style</span>
                                    <input value={draftProfile.travelStyle} onChange={(event) => updateDraft("travelStyle", event.target.value)} className="w-full rounded-[0.7rem] border border-[#cf8d45]/55 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1.1rem] text-[#50300d] outline-none interactive-transition hover:border-[#cf8d45]/70 focus:border-[#7a3f00] focus:ring-2 focus:ring-[#cf8d45]/35 focus:shadow-[0_0_8px_rgb(199_141_69_/_20%)]" />
                                </label>
                                <div className="flex flex-wrap justify-end gap-3 pt-2">
                                    <button type="button" className="rounded-full border border-[#cf8d45] bg-[#fff7ee] px-5 py-2.5 font-[Adamina] text-[0.92rem] text-[#50300d] interactive-transition hover:-translate-y-px hover:bg-[#f6dfc1] hover:shadow-[0_4px_12px_rgb(122_63_0_/_15%)] active:translate-y-px" onClick={() => setIsEditing(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={isSaving} className="rounded-full border border-[#7a3f00] bg-[#5a392b] px-5 py-2.5 font-[Adamina] text-[0.92rem] text-[#ffead4] interactive-transition hover:-translate-y-px hover:bg-[#7a3f00] hover:shadow-[0_4px_12px_rgb(122_63_0_/_20%)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60">
                                        {isSaving ? "Saving..." : "Save profile"}
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
