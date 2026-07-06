import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Edit, HelpCircle, Loader2, LogOut, Settings } from "lucide-react";
import paperBackground from "../assets/wrinkled-paper.png";
import SubscriptionStatus from "../components/SubscriptionStatus";
import { supabase } from "../lib/supabase/client";
import {
    loadGalleryItems,
    loadJournalProfile,
    mapProfileToDisplayName,
    saveUserPreferences,
    type JournalProfile,
    type UserPreferences,
    upsertJournalProfile
} from "../lib/supabase/journal";
import { useScrollToTop } from "../hooks/useScrollToTop";

export type ProfileProps = Record<string, never>;

type ProfileDraft = {
    firstName: string;
    lastName: string;
    travelStyle: string;
    currentFocus: string;
    avatarUrl: string;
};

const defaultDraft: ProfileDraft = {
    firstName: "",
    lastName: "",
    travelStyle: "",
    currentFocus: "",
    avatarUrl: ""
};

function initialsFromName(value: string): string {
    return value
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "TR";
}

export function Profile() {
    const navigate = useNavigate();
    const { showScrollTop, scrollToTop } = useScrollToTop();
    const [scrollBtnBottom, setScrollBtnBottom] = useState(window.innerHeight * 0.02);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [profile, setProfile] = useState<JournalProfile | null>(null);
    const [preferences, setPreferences] = useState<UserPreferences | null>(null);
    const [galleryCount, setGalleryCount] = useState(0);
    const [countryCount, setCountryCount] = useState(0);
    const [draft, setDraft] = useState<ProfileDraft>(defaultDraft);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            try {
                const [{ profile: loadedProfile, preferences: loadedPreferences }, countries, gallery] = await Promise.all([
                    loadJournalProfile(),
                    supabase.auth.getUser().then(async ({ data }) => {
                        if (!data.user) {
                            return [];
                        }
                        const { data: rows, error } = await supabase
                            .from("country_statuses")
                            .select("country_name")
                            .eq("user_id", data.user.id);
                        if (error) {
                            throw error;
                        }
                        return rows ?? [];
                    }),
                    loadGalleryItems()
                ]);

                if (!mounted) {
                    return;
                }

                setProfile(loadedProfile);
                setPreferences(loadedPreferences);
                setGalleryCount(gallery.length);
                setCountryCount(countries.length);
                setDraft({
                    firstName: loadedPreferences?.firstName ?? "",
                    lastName: loadedPreferences?.lastName ?? "",
                    travelStyle: loadedPreferences?.travelStyle ?? "",
                    currentFocus: loadedPreferences?.currentFocus ?? "",
                    avatarUrl: loadedProfile.avatarUrl ?? ""
                });
            } catch (fetchError) {
                if (!mounted) {
                    return;
                }

                setError(fetchError instanceof Error ? fetchError.message : "Failed to load profile.");
            }
        };

        void load();

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
            setScrollBtnBottom(overlap > 0 ? baseBottom + overlap + padding : baseBottom);
        }

        adjustScrollButton();
        window.addEventListener("scroll", adjustScrollButton, { passive: true });
        window.addEventListener("resize", adjustScrollButton);

        return () => {
            mounted = false;
            window.removeEventListener("scroll", adjustScrollButton);
            window.removeEventListener("resize", adjustScrollButton);
        };
    }, []);

    const displayName = useMemo(() => {
        if (!profile) {
            return "Traveler";
        }

        return mapProfileToDisplayName(profile, {
            firstName: preferences?.firstName ?? null,
            lastName: preferences?.lastName ?? null,
            travelStyle: preferences?.travelStyle ?? null,
            currentFocus: preferences?.currentFocus ?? null,
            secondaryEmail: preferences?.secondaryEmail ?? null,
            weeklyDigest: preferences?.weeklyDigest ?? true,
            itineraryReminders: preferences?.itineraryReminders ?? true,
            featureAnnouncements: preferences?.featureAnnouncements ?? false,
            paymentAlerts: preferences?.paymentAlerts ?? true,
            theme: preferences?.theme ?? "heritage",
            language: preferences?.language ?? "english",
            mapAutoRotate: preferences?.mapAutoRotate ?? true,
            compactCards: preferences?.compactCards ?? false
        });
    }, [preferences, profile]);

    const currentDraft = draft.avatarUrl.trim() || profile?.avatarUrl || "";
    const initials = initialsFromName(displayName);

    const updateDraft = (field: keyof ProfileDraft, value: string) => {
        setDraft((current) => ({ ...current, [field]: value }));
    };

    const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.addEventListener("load", () => {
            if (typeof reader.result === "string") {
                updateDraft("avatarUrl", reader.result);
            }
        });
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!profile) {
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const [savedProfile, savedPreferences] = await Promise.all([
                upsertJournalProfile({
                    username: `${draft.firstName} ${draft.lastName}`.trim() || null,
                    avatarUrl: draft.avatarUrl.trim() || null
                }),
                saveUserPreferences({
                    firstName: draft.firstName.trim() || null,
                    lastName: draft.lastName.trim() || null,
                    travelStyle: draft.travelStyle.trim() || null,
                    currentFocus: draft.currentFocus.trim() || null,
                    secondaryEmail: preferences?.secondaryEmail ?? null,
                    weeklyDigest: preferences?.weeklyDigest ?? true,
                    itineraryReminders: preferences?.itineraryReminders ?? true,
                    featureAnnouncements: preferences?.featureAnnouncements ?? false,
                    paymentAlerts: preferences?.paymentAlerts ?? true,
                    theme: preferences?.theme ?? "heritage",
                    language: preferences?.language ?? "english",
                    mapAutoRotate: preferences?.mapAutoRotate ?? true,
                    compactCards: preferences?.compactCards ?? false
                })
            ]);

            setProfile(savedProfile);
            setPreferences(savedPreferences ?? preferences);
            setIsEditing(false);
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Failed to save profile.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        setError(null);

        try {
            const { error: signOutError } = await supabase.auth.signOut();
            if (signOutError) {
                throw signOutError;
            }

            navigate("/welcome", { replace: true });
        } catch (logoutError) {
            setError(logoutError instanceof Error ? logoutError.message : "Failed to log out.");
        } finally {
            setIsLoggingOut(false);
        }
    };

    useEffect(() => {
        if (!profile && !error) {
            void supabase.auth.getUser().then(({ data }) => {
                if (!data.user) {
                    navigate("/welcome", { replace: true });
                }
            });
        }
    }, [error, navigate, profile]);

    return (
        <section className="mx-auto w-full max-w-[min(95vw,1380px)] px-[max(1.25rem,5%)] py-[max(2rem,6vh)] text-[#50300d]" aria-labelledby="profile-title">
            <div
                className="overflow-hidden rounded-[1.35rem] border border-[#8f5a20]/35 bg-[#ffead4]/95 shadow-[0_18px_42px_rgb(80_48_13_/_20%),inset_0_0_0_1px_rgb(255_244_231_/_55%)]"
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
                                {displayName}
                            </h1>
                            <p className="mt-4 max-w-[42rem] font-[Cormorant_Garamond] text-[1.25rem] leading-[1.35] text-[#f7dfca]">
                                Your account details, photo library, and country history now live in Supabase instead of browser-only storage.
                            </p>
                        </div>
                        <div className="flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#f6d7b5]/70 bg-[#cf8d45] font-[Adamina] text-[1.9rem] text-[#fff4e7]">
                            {currentDraft ? <img src={currentDraft} alt="" className="h-full w-full object-cover" /> : initials}
                        </div>
                    </div>
                </div>

                <div className="grid gap-7 px-6 py-7 sm:px-9 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <div className="space-y-7">
                        <div className="rounded-[1rem] border border-[#cf8d45]/35 bg-[#fff4e7]/52 p-5 shadow-[inset_0_0_24px_rgb(143_90_32_/_8%)]">
                            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                                <div className="rounded-[0.8rem] border border-[#cf8d45]/25 bg-[#ffead4]/45 px-4 py-3">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#7a3f00]">Traveler name</p>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.25rem] text-[#50300d]">{displayName}</p>
                                </div>
                                <div className="rounded-[0.8rem] border border-[#cf8d45]/25 bg-[#ffead4]/45 px-4 py-3">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#7a3f00]">Email address</p>
                                    <p className="mt-1 break-all font-[Cormorant_Garamond] text-[1.25rem] text-[#50300d]">{profile?.email ?? "Loading..."}</p>
                                </div>
                                <div className="rounded-[0.8rem] border border-[#cf8d45]/25 bg-[#ffead4]/45 px-4 py-3">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#7a3f00]">Favorite travel style</p>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.25rem] text-[#50300d]">{preferences?.travelStyle ?? "Not set yet"}</p>
                                </div>
                                <div className="rounded-[0.8rem] border border-[#cf8d45]/25 bg-[#ffead4]/45 px-4 py-3">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#7a3f00]">Current focus</p>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.25rem] text-[#50300d]">{preferences?.currentFocus ?? "Not set yet"}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <article className="rounded-[0.9rem] border border-[#cf8d45]/35 bg-[#fff4e7]/72 p-4 shadow-[inset_0_0_16px_rgb(143_90_32_/_7%)]">
                                <p className="font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">Countries</p>
                                <p className="mt-2 font-[Adamina] text-[2rem] leading-none text-[#50300d]">{countryCount}</p>
                            </article>
                            <article className="rounded-[0.9rem] border border-[#cf8d45]/35 bg-[#fff4e7]/72 p-4 shadow-[inset_0_0_16px_rgb(143_90_32_/_7%)]">
                                <p className="font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">Gallery items</p>
                                <p className="mt-2 font-[Adamina] text-[2rem] leading-none text-[#50300d]">{galleryCount}</p>
                            </article>
                            <article className="rounded-[0.9rem] border border-[#cf8d45]/35 bg-[#fff4e7]/72 p-4 shadow-[inset_0_0_16px_rgb(143_90_32_/_7%)]">
                                <p className="font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">Subscription</p>
                                <p className="mt-2 font-[Adamina] text-[1.1rem] leading-none text-[#50300d]">{profile?.subscriptionTier ?? "free"}</p>
                            </article>
                        </div>
                    </div>

                    <aside className="flex flex-col gap-3 rounded-[1rem] p-4">
                        <SubscriptionStatus />

                        <div className="rounded-[1rem] border border-[#cf8d45]/45 bg-[#fff7ee]/80 p-4 shadow-[inset_0_0_16px_rgb(143_90_32_/_7%)]">
                            <p className="font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">Quick actions</p>
                            <div className="mt-3 grid gap-2">
                                <Link
                                    to="/settings"
                                    className="inline-flex w-full items-center justify-between rounded-[0.8rem] border border-[#7a3f00] bg-[#5a392b] px-3 py-2.5 font-[Adamina] text-[0.85rem] uppercase tracking-[0.08em] text-[#ffead4] transition hover:bg-[#7a3f00]"
                                >
                                    Settings <Settings size={16} />
                                </Link>

                                <Link
                                    to="/help-center"
                                    className="inline-flex w-full items-center justify-between rounded-[0.8rem] border border-[#cf8d45] bg-[#ffead4] px-3 py-2.5 font-[Adamina] text-[0.85rem] uppercase tracking-[0.08em] text-[#50300d] transition hover:bg-[#f6dfc1]"
                                >
                                    Help center <HelpCircle size={16} />
                                </Link>

                                <button
                                    type="button"
                                    className="inline-flex w-full items-center justify-between rounded-[0.8rem] border border-[#a56a2f] bg-[#fff4e7] px-3 py-2.5 font-[Adamina] text-[0.85rem] uppercase tracking-[0.08em] text-[#6f3b08] transition hover:bg-[#ffe4c5]"
                                    onClick={() => setIsEditing(true)}
                                >
                                    Edit profile <Edit size={16} />
                                </button>

                                <button
                                    type="button"
                                    disabled={isLoggingOut}
                                    className="inline-flex w-full items-center justify-between rounded-[0.8rem] border border-[#9e3a1f] bg-[#fff1ee] px-3 py-2.5 font-[Adamina] text-[0.85rem] uppercase tracking-[0.08em] text-[#9e3a1f] transition hover:bg-[#ffe1d9] disabled:cursor-not-allowed disabled:opacity-75"
                                    onClick={() => {
                                        void handleLogout();
                                    }}
                                >
                                    {isLoggingOut ? "Logging out..." : "Log out"}
                                    {isLoggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                                </button>
                            </div>
                        </div>
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

                        {error && (
                            <div className="mt-4 rounded-[0.85rem] border border-red-300 bg-red-50 px-4 py-3 font-[Cormorant_Garamond] text-red-800">
                                {error}
                            </div>
                        )}

                        <div className="mt-6 grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
                            <div>
                                <div className="mx-auto flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border border-[#cf8d45] bg-[#cf8d45]">
                                    {draft.avatarUrl ? <img src={draft.avatarUrl} alt="Selected avatar preview" className="h-full w-full object-cover" /> : <span className="font-[Adamina] text-[1.7rem] text-[#fff4e7]">{initials}</span>}
                                </div>
                                <label className="mt-4 block rounded-[0.8rem] border border-dashed border-[#cf8d45] bg-[#fff7ee]/70 px-4 py-3 text-center font-[Adamina] text-[0.9rem] text-[#50300d]">
                                    Upload avatar
                                    <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarUpload} />
                                </label>
                                <label className="mt-4 block">
                                    <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">Avatar URL</span>
                                    <input
                                        value={draft.avatarUrl}
                                        onChange={(event) => updateDraft("avatarUrl", event.target.value)}
                                        placeholder="https://..."
                                        className="w-full rounded-[0.7rem] border border-[#cf8d45]/55 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1.1rem] text-[#50300d] outline-none focus:border-[#7a3f00] focus:ring-2 focus:ring-[#cf8d45]/35"
                                    />
                                </label>
                            </div>

                            <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void handleSave(); }}>
                                <label className="block">
                                    <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">First name</span>
                                    <input value={draft.firstName} onChange={(event) => updateDraft("firstName", event.target.value)} className="w-full rounded-[0.7rem] border border-[#cf8d45]/55 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1.1rem] text-[#50300d] outline-none focus:border-[#7a3f00] focus:ring-2 focus:ring-[#cf8d45]/35" />
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">Last name</span>
                                    <input value={draft.lastName} onChange={(event) => updateDraft("lastName", event.target.value)} className="w-full rounded-[0.7rem] border border-[#cf8d45]/55 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1.1rem] text-[#50300d] outline-none focus:border-[#7a3f00] focus:ring-2 focus:ring-[#cf8d45]/35" />
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">Favorite travel style</span>
                                    <input value={draft.travelStyle} onChange={(event) => updateDraft("travelStyle", event.target.value)} className="w-full rounded-[0.7rem] border border-[#cf8d45]/55 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1.1rem] text-[#50300d] outline-none focus:border-[#7a3f00] focus:ring-2 focus:ring-[#cf8d45]/35" />
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">Current focus</span>
                                    <input value={draft.currentFocus} onChange={(event) => updateDraft("currentFocus", event.target.value)} className="w-full rounded-[0.7rem] border border-[#cf8d45]/55 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1.1rem] text-[#50300d] outline-none focus:border-[#7a3f00] focus:ring-2 focus:ring-[#cf8d45]/35" />
                                </label>
                                <div className="flex flex-wrap justify-end gap-3 pt-2">
                                    <button type="button" className="rounded-full border border-[#cf8d45] bg-[#fff7ee] px-5 py-2.5 font-[Adamina] text-[0.92rem] text-[#50300d]" onClick={() => setIsEditing(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={isSaving} className="rounded-full border border-[#7a3f00] bg-[#5a392b] px-5 py-2.5 font-[Adamina] text-[0.92rem] text-[#ffead4] flex items-center gap-2">
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
