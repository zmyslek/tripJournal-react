import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import paperBackground from "../assets/wrinkled-paper.png";
import PremiumPlans from "../components/PremiumPlans";
import { supabase } from "../lib/supabase/client";
import { loadJournalProfile, saveUserPreferences, type JournalProfile, type UserPreferences } from "../lib/supabase/journal";
import { useScrollToTop } from "../hooks/useScrollToTop";

export type SettingsProps = Record<string, never>;

type SettingsSectionId = "account" | "notifications" | "premium" | "about";

interface SettingsSection {
    id: SettingsSectionId;
    label: string;
    description: string;
}

const sections: SettingsSection[] = [
    { id: "account", label: "Account", description: "Profile details and contact info" },
    { id: "notifications", label: "Notifications", description: "Email and billing alerts" },
    { id: "premium", label: "Premium", description: "Plan, billing, and renewals" },
    { id: "about", label: "About & policies", description: "Help and legal pages" }
];

type SettingsDraft = {
    firstName: string;
    lastName: string;
    secondaryEmail: string;
    weeklyDigest: boolean;
    itineraryReminders: boolean;
    featureAnnouncements: boolean;
    paymentAlerts: boolean;
    theme: "heritage" | "modern-preview";
    language: "english" | "polish";
    mapAutoRotate: boolean;
    compactCards: boolean;
};

const defaultDraft: SettingsDraft = {
    firstName: "",
    lastName: "",
    secondaryEmail: "",
    weeklyDigest: true,
    itineraryReminders: true,
    featureAnnouncements: false,
    paymentAlerts: true,
    theme: "heritage",
    language: "english",
    mapAutoRotate: true,
    compactCards: false
};

function fieldValue(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>): string {
    return event.target.value;
}

export function Settings() {
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState<SettingsSectionId>("account");
    const [profile, setProfile] = useState<JournalProfile | null>(null);
    const [preferences, setPreferences] = useState<UserPreferences | null>(null);
    const [draft, setDraft] = useState<SettingsDraft>(defaultDraft);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scrollBtnBottom, setScrollBtnBottom] = useState(window.innerHeight * 0.02);
    const { showScrollTop, scrollToTop } = useScrollToTop();

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            try {
                const [{ profile: loadedProfile, preferences: loadedPreferences }, session] = await Promise.all([
                    loadJournalProfile(),
                    supabase.auth.getUser()
                ]);

                if (!mounted) {
                    return;
                }

                setProfile(loadedProfile);
                setPreferences(loadedPreferences);
                setDraft({
                    firstName: loadedPreferences?.firstName ?? "",
                    lastName: loadedPreferences?.lastName ?? "",
                    secondaryEmail: loadedPreferences?.secondaryEmail ?? "",
                    weeklyDigest: loadedPreferences?.weeklyDigest ?? true,
                    itineraryReminders: loadedPreferences?.itineraryReminders ?? true,
                    featureAnnouncements: loadedPreferences?.featureAnnouncements ?? false,
                    paymentAlerts: loadedPreferences?.paymentAlerts ?? true,
                    theme: loadedPreferences?.theme ?? "heritage",
                    language: loadedPreferences?.language ?? "english",
                    mapAutoRotate: loadedPreferences?.mapAutoRotate ?? true,
                    compactCards: loadedPreferences?.compactCards ?? false
                });

                if (!session.data.user) {
                    navigate("/welcome", { replace: true });
                }
            } catch (loadError) {
                if (!mounted) {
                    return;
                }

                setError(loadError instanceof Error ? loadError.message : "Failed to load settings.");
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
    }, [navigate]);

    const accountName = useMemo(() => {
        return `${draft.firstName} ${draft.lastName}`.trim() || profile?.username || "Traveler";
    }, [draft.firstName, draft.lastName, profile?.username]);

    const updateDraft = (patch: Partial<SettingsDraft>) => {
        setDraft((current) => ({ ...current, ...patch }));
    };

    const save = async () => {
        setIsSaving(true);
        setError(null);

        try {
            const saved = await saveUserPreferences({
                firstName: draft.firstName.trim() || null,
                lastName: draft.lastName.trim() || null,
                travelStyle: preferences?.travelStyle ?? null,
                currentFocus: preferences?.currentFocus ?? null,
                secondaryEmail: draft.secondaryEmail.trim() || null,
                weeklyDigest: draft.weeklyDigest,
                itineraryReminders: draft.itineraryReminders,
                featureAnnouncements: draft.featureAnnouncements,
                paymentAlerts: draft.paymentAlerts,
                theme: draft.theme,
                language: draft.language,
                mapAutoRotate: draft.mapAutoRotate,
                compactCards: draft.compactCards
            });

            setPreferences(saved ?? preferences);
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Failed to save settings.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className="mx-auto w-full max-w-[min(95vw,1380px)] px-[max(1.25rem,5%)] py-[max(2rem,6vh)] text-[#50300d]" aria-labelledby="settings-title">
            <div className="overflow-hidden rounded-[1.35rem] border border-[#8f5a20]/35 bg-[#ffead4]/95 shadow-[0_18px_42px_rgb(80_48_13_/_20%),inset_0_0_0_1px_rgb(255_244_231_/_55%)]">
                <div
                    className="relative min-h-[11rem] bg-[#5a392b] px-6 py-7 text-[#ffead4] sm:px-9"
                    style={{ backgroundImage: `linear-gradient(rgb(90 57 43 / 0.9), rgb(90 57 43 / 0.9)), url(${paperBackground})`, backgroundSize: "cover" }}
                >
                    <p className="m-0 font-[Adamina] text-[0.7rem] uppercase tracking-[0.24em] text-[#f6d7b5]">Settings</p>
                    <h1 id="settings-title" className="mt-3 font-[Adamina] text-[clamp(2.2rem,5vw,3.8rem)] leading-none text-[#fff4e7]">
                        Account center
                    </h1>
                    <p className="mt-4 max-w-[46rem] font-[Cormorant_Garamond] text-[1.25rem] leading-[1.35] text-[#f7dfca]">
                        Manage traveler details, notification preferences, and live subscription state from Supabase.
                    </p>
                </div>

                <div className="grid gap-7 px-6 py-7 sm:px-9 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)]">
                    <aside className="rounded-[1rem] border border-[#cf8d45]/35 bg-[#fff4e7]/72 p-4 shadow-[inset_0_0_16px_rgb(143_90_32_/_8%)]">
                        <p className="font-[Adamina] text-[0.7rem] uppercase tracking-[0.2em] text-[#7a3f00]">General</p>
                        <nav className="mt-3 flex flex-col gap-1.5" aria-label="Settings categories">
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    type="button"
                                    onClick={() => setActiveSection(section.id)}
                                    className={`w-full rounded-[0.9rem] px-3 py-2.5 text-left transition ${
                                        activeSection === section.id
                                            ? "border border-[#cf8d45]/70 bg-[#f4ddbf] shadow-[0_4px_12px_rgb(122_63_0_/_10%)]"
                                            : "border border-transparent hover:border-[#cf8d45]/40 hover:bg-[#ffead4]/80"
                                    }`}
                                >
                                    <p className="m-0 font-[Adamina] text-[0.92rem] text-[#50300d]">{section.label}</p>
                                    <p className="mt-1 m-0 font-[Cormorant_Garamond] text-[1rem] leading-[1.25] text-[#7a3f00]">{section.description}</p>
                                </button>
                            ))}
                        </nav>
                    </aside>

                    <div className="space-y-5 min-w-0">
                        {error && (
                            <div className="rounded-[0.9rem] border border-red-300 bg-red-50 px-4 py-3 font-[Cormorant_Garamond] text-red-800">
                                {error}
                            </div>
                        )}

                        {activeSection === "account" && (
                            <article className="rounded-[1rem] border border-[#cf8d45]/35 bg-[#fff4e7]/72 p-5 shadow-[inset_0_0_18px_rgb(143_90_32_/_8%)]">
                                <h2 className="font-[Adamina] text-[1.4rem] text-[#50300d]">User account settings</h2>
                                <p className="mt-2 font-[Cormorant_Garamond] text-[1.1rem] text-[#7a3f00]">Signed in as {accountName}</p>
                                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                    <label className="block">
                                        <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">First name</span>
                                        <input value={draft.firstName} onChange={(event) => updateDraft({ firstName: fieldValue(event) })} className="w-full rounded-[0.7rem] border border-[#cf8d45]/55 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1.08rem] text-[#50300d] outline-none focus:border-[#7a3f00] focus:ring-2 focus:ring-[#cf8d45]/35" />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">Last name</span>
                                        <input value={draft.lastName} onChange={(event) => updateDraft({ lastName: fieldValue(event) })} className="w-full rounded-[0.7rem] border border-[#cf8d45]/55 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1.08rem] text-[#50300d] outline-none focus:border-[#7a3f00] focus:ring-2 focus:ring-[#cf8d45]/35" />
                                    </label>
                                    <label className="block sm:col-span-2">
                                        <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">Primary email</span>
                                        <input value={profile?.email ?? ""} readOnly className="w-full rounded-[0.7rem] border border-[#cf8d45]/40 bg-[#f6ebdd] px-3 py-2 font-[Cormorant_Garamond] text-[1.08rem] text-[#7a3f00] outline-none" />
                                    </label>
                                    <label className="block sm:col-span-2">
                                        <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">Secondary email</span>
                                        <input type="email" value={draft.secondaryEmail} onChange={(event) => updateDraft({ secondaryEmail: fieldValue(event) })} placeholder="Optional backup email" className="w-full rounded-[0.7rem] border border-[#cf8d45]/55 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1.08rem] text-[#50300d] outline-none focus:border-[#7a3f00] focus:ring-2 focus:ring-[#cf8d45]/35" />
                                    </label>
                                </div>
                            </article>
                        )}

                        {activeSection === "notifications" && (
                            <article className="rounded-[1rem] border border-[#cf8d45]/35 bg-[#fff4e7]/72 p-5 shadow-[inset_0_0_18px_rgb(143_90_32_/_8%)]">
                                <h2 className="font-[Adamina] text-[1.4rem] text-[#50300d]">Notifications</h2>
                                <p className="mt-2 font-[Cormorant_Garamond] text-[1.1rem] text-[#7a3f00]">Choose what reaches your inbox.</p>
                                <div className="mt-5 space-y-3">
                                    <label className="flex items-center justify-between gap-3 rounded-[0.8rem] border border-[#cf8d45]/30 bg-[#ffead4]/60 px-4 py-3">
                                        <span className="font-[Cormorant_Garamond] text-[1.15rem] text-[#50300d]">Weekly travel digest</span>
                                        <input type="checkbox" checked={draft.weeklyDigest} onChange={(event) => updateDraft({ weeklyDigest: event.target.checked })} className="h-4 w-4 accent-[#7a3f00]" />
                                    </label>
                                    <label className="flex items-center justify-between gap-3 rounded-[0.8rem] border border-[#cf8d45]/30 bg-[#ffead4]/60 px-4 py-3">
                                        <span className="font-[Cormorant_Garamond] text-[1.15rem] text-[#50300d]">Itinerary reminders</span>
                                        <input type="checkbox" checked={draft.itineraryReminders} onChange={(event) => updateDraft({ itineraryReminders: event.target.checked })} className="h-4 w-4 accent-[#7a3f00]" />
                                    </label>
                                    <label className="flex items-center justify-between gap-3 rounded-[0.8rem] border border-[#cf8d45]/30 bg-[#ffead4]/60 px-4 py-3">
                                        <span className="font-[Cormorant_Garamond] text-[1.15rem] text-[#50300d]">Feature announcements</span>
                                        <input type="checkbox" checked={draft.featureAnnouncements} onChange={(event) => updateDraft({ featureAnnouncements: event.target.checked })} className="h-4 w-4 accent-[#7a3f00]" />
                                    </label>
                                    <label className="flex items-center justify-between gap-3 rounded-[0.8rem] border border-[#cf8d45]/30 bg-[#ffead4]/60 px-4 py-3">
                                        <span className="font-[Cormorant_Garamond] text-[1.15rem] text-[#50300d]">Payment and subscription alerts</span>
                                        <input type="checkbox" checked={draft.paymentAlerts} onChange={(event) => updateDraft({ paymentAlerts: event.target.checked })} className="h-4 w-4 accent-[#7a3f00]" />
                                    </label>
                                </div>
                            </article>
                        )}

                        {activeSection === "premium" && (
                            <article className="rounded-[1rem] border border-[#cf8d45]/35 bg-[#fff4e7]/72 p-5 shadow-[inset_0_0_18px_rgb(143_90_32_/_8%)] lg:px-6 lg:py-6 xl:px-7">
                                <PremiumPlans />
                            </article>
                        )}

                        {activeSection === "about" && (
                            <article className="rounded-[1rem] border border-[#cf8d45]/35 bg-[#fff4e7]/72 p-5 shadow-[inset_0_0_18px_rgb(143_90_32_/_8%)]">
                                <h2 className="font-[Adamina] text-[1.4rem] text-[#50300d]">About app and policies</h2>
                                <p className="mt-2 font-[Cormorant_Garamond] text-[1.1rem] text-[#7a3f00]">
                                    Legal pages remain available in the footer as well. This section gives you a quick account-level shortcut.
                                </p>

                                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                    <Link to="/help-center" className="rounded-[0.8rem] border border-[#cf8d45]/45 bg-[#ffead4]/65 px-4 py-3 font-[Adamina] text-[#50300d] no-underline transition hover:bg-[#f6dfc1]">
                                        Help center
                                    </Link>
                                    <Link to="/policies/privacy" className="rounded-[0.8rem] border border-[#cf8d45]/45 bg-[#ffead4]/65 px-4 py-3 font-[Adamina] text-[#50300d] no-underline transition hover:bg-[#f6dfc1]">
                                        Privacy policy
                                    </Link>
                                    <Link to="/policies/cookies" className="rounded-[0.8rem] border border-[#cf8d45]/45 bg-[#ffead4]/65 px-4 py-3 font-[Adamina] text-[#50300d] no-underline transition hover:bg-[#f6dfc1]">
                                        Cookie policy
                                    </Link>
                                    <Link to="/policies/terms" className="rounded-[0.8rem] border border-[#cf8d45]/45 bg-[#ffead4]/65 px-4 py-3 font-[Adamina] text-[#50300d] no-underline transition hover:bg-[#f6dfc1]">
                                        Terms of use
                                    </Link>
                                    <Link to="/policies/accessibility" className="rounded-[0.8rem] border border-[#cf8d45]/45 bg-[#ffead4]/65 px-4 py-3 font-[Adamina] text-[#50300d] no-underline transition hover:bg-[#f6dfc1]">
                                        Accessibility
                                    </Link>
                                </div>

                                <div className="mt-6 grid gap-4 rounded-[0.9rem] border border-[#cf8d45]/30 bg-[#ffead4]/60 p-4 sm:grid-cols-2">
                                    <label className="block">
                                        <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">Theme</span>
                                        <select value={draft.theme} onChange={(event) => updateDraft({ theme: fieldValue(event) as SettingsDraft["theme"] })} className="w-full rounded-[0.7rem] border border-[#cf8d45]/55 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1.08rem] text-[#50300d] outline-none focus:border-[#7a3f00] focus:ring-2 focus:ring-[#cf8d45]/35">
                                            <option value="heritage">Heritage brown</option>
                                            <option value="modern-preview">Modern grey preview</option>
                                        </select>
                                    </label>
                                    <label className="block">
                                        <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">Language</span>
                                        <select value={draft.language} onChange={(event) => updateDraft({ language: fieldValue(event) as SettingsDraft["language"] })} className="w-full rounded-[0.7rem] border border-[#cf8d45]/55 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1.08rem] text-[#50300d] outline-none focus:border-[#7a3f00] focus:ring-2 focus:ring-[#cf8d45]/35">
                                            <option value="english">English</option>
                                            <option value="polish">Polski</option>
                                        </select>
                                    </label>
                                    <label className="flex items-center justify-between gap-3 rounded-[0.8rem] border border-[#cf8d45]/30 bg-[#fff7ee] px-4 py-3">
                                        <span className="font-[Cormorant_Garamond] text-[1.12rem] text-[#50300d]">Map auto-rotate</span>
                                        <input type="checkbox" checked={draft.mapAutoRotate} onChange={(event) => updateDraft({ mapAutoRotate: event.target.checked })} className="h-4 w-4 accent-[#7a3f00]" />
                                    </label>
                                    <label className="flex items-center justify-between gap-3 rounded-[0.8rem] border border-[#cf8d45]/30 bg-[#fff7ee] px-4 py-3">
                                        <span className="font-[Cormorant_Garamond] text-[1.12rem] text-[#50300d]">Compact cards</span>
                                        <input type="checkbox" checked={draft.compactCards} onChange={(event) => updateDraft({ compactCards: event.target.checked })} className="h-4 w-4 accent-[#7a3f00]" />
                                    </label>
                                </div>
                            </article>
                        )}

                        {activeSection !== "premium" && (
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => void save()}
                                    disabled={isSaving}
                                    className="rounded-full border border-[#7a3f00] bg-[#5a392b] px-5 py-2.5 font-[Adamina] text-[0.92rem] text-[#ffead4] transition hover:bg-[#7a3f00] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSaving ? "Saving..." : "Save changes"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

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

export default Settings;
