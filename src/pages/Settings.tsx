import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useScrollToTop } from "../hooks/useScrollToTop";
import { UnsplashAttribution } from "../components/UnsplashAttribution";
import { requestUnsplashDownload, useUnsplashPhoto } from "../lib/unsplash";
import { loadCloudUserPreferences, loadCloudUserProfile, saveCloudUserSettings, type CloudUserPreferences } from "../infrastructure/user/SupabaseUserProfileRepository";
// import PremiumPlans from "../components/PremiumPlans";

export type SettingsProps = Record<string, never>;

interface AccountSettings {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    secondaryEmail: string;
}

interface NotificationSettings {
    weeklyDigest: boolean;
    itineraryReminders: boolean;
    featureAnnouncements: boolean;
    // paymentAlerts: boolean;
}

// interface PremiumSettings {
//     plan: "free" | "monthly" | "yearly";
//     autoRenew: boolean;
//     billingEmail: string;
//     paymentMethod: string;
//     renewalDate: string;
// }

interface AppSettings {
    theme: "heritage" | "modern-preview";
    language: "english" | "polish";
    mapAutoRotate: boolean;
    compactCards: boolean;
}

interface UserSettings {
    account: AccountSettings;
    notifications: NotificationSettings;
    // premium: PremiumSettings;
    app: AppSettings;
}

type SettingsSectionId = "account" | "notifications" | "about"; //| "premium" add before about

interface SettingsSection {
    id: SettingsSectionId;
    label: string;
    description: string;
}


const sections: SettingsSection[] = [
    { id: "account", label: "Account", description: "Profile details and contact info" },
    { id: "notifications", label: "Notifications", description: "Email and journal alerts" },
    // { id: "premium", label: "Premium", description: "Plan, billing, and renewals" },
    { id: "about", label: "About & policies", description: "Help and legal pages" }
];

const SETTINGS_CACHE_KEY = "tripjournal:settings:v1";

const defaultSettings: UserSettings = {
    account: {
        firstName: "",
        lastName: "",
        username: "",
        email: "",
        secondaryEmail: ""
    },
    notifications: {
        weeklyDigest: true,
        itineraryReminders: true,
        featureAnnouncements: false
    },
    // premium: {
    //     plan: "free",
    //     autoRenew: false,
    //     billingEmail: "john.doe@example.com",
    //     paymentMethod: "Visa ending in 4242",
    //     renewalDate: "No active renewal"
    // },
    app: {
        theme: "heritage",
        language: "english",
        mapAutoRotate: true,
        compactCards: false
    }
};

function getCachedSettings(): UserSettings {
    try {
        const cachedSettings = localStorage.getItem(SETTINGS_CACHE_KEY);
        if (!cachedSettings) {
            return defaultSettings;
        }

        const parsedSettings = JSON.parse(cachedSettings);
        if (!parsedSettings || typeof parsedSettings !== "object") {
            return defaultSettings;
        }

        return {
            account: {
                firstName: typeof parsedSettings.account?.firstName === "string" ? parsedSettings.account.firstName : defaultSettings.account.firstName,
                lastName: typeof parsedSettings.account?.lastName === "string" ? parsedSettings.account.lastName : defaultSettings.account.lastName,
                username: typeof parsedSettings.account?.username === "string" ? parsedSettings.account.username : defaultSettings.account.username,
                email: typeof parsedSettings.account?.email === "string" ? parsedSettings.account.email : defaultSettings.account.email,
                secondaryEmail: typeof parsedSettings.account?.secondaryEmail === "string" ? parsedSettings.account.secondaryEmail : defaultSettings.account.secondaryEmail
            },
            notifications: {
                weeklyDigest: Boolean(parsedSettings.notifications?.weeklyDigest),
                itineraryReminders: Boolean(parsedSettings.notifications?.itineraryReminders),
                featureAnnouncements: Boolean(parsedSettings.notifications?.featureAnnouncements)
            },
            // premium: {
            //     plan: parsedSettings.premium?.plan === "monthly" || parsedSettings.premium?.plan === "yearly" ? parsedSettings.premium.plan : "free",
            //     autoRenew: Boolean(parsedSettings.premium?.autoRenew),
            //     billingEmail: typeof parsedSettings.premium?.billingEmail === "string" ? parsedSettings.premium.billingEmail : defaultSettings.premium.billingEmail,
            //     paymentMethod: typeof parsedSettings.premium?.paymentMethod === "string" ? parsedSettings.premium.paymentMethod : defaultSettings.premium.paymentMethod,
            //     renewalDate: typeof parsedSettings.premium?.renewalDate === "string" ? parsedSettings.premium.renewalDate : defaultSettings.premium.renewalDate
            // },
            app: {
                theme: parsedSettings.app?.theme === "modern-preview" ? "modern-preview" : "heritage",
                language: parsedSettings.app?.language === "polish" ? "polish" : "english",
                mapAutoRotate: parsedSettings.app?.mapAutoRotate !== false,
                compactCards: Boolean(parsedSettings.app?.compactCards)
            }
        };
    } catch {
        return defaultSettings;
    }
}

function fieldValue(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>): string {
    return event.target.value;
}

function sectionFromHash(hash: string): SettingsSectionId {
    const sectionId = hash.replace(/^#/, "") as SettingsSectionId;
    return sections.some((section) => section.id === sectionId) ? sectionId : "account";
}

export function Settings() {
    const heroPhoto = useUnsplashPhoto("photo-1529260830199-42c24126f198");
    const location = useLocation();
    const navigate = useNavigate();
    const [settings, setSettings] = useState<UserSettings>(() => getCachedSettings());
    const [cloudUserId, setCloudUserId] = useState<string | null>(null);
    const [isHydrated, setIsHydrated] = useState(false);
    const [settingsError, setSettingsError] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState<SettingsSectionId>("account");
    const { showScrollTop, scrollToTop } = useScrollToTop();
    const [scrollBtnBottom, setScrollBtnBottom] = useState(window.innerHeight * 0.02);

    useEffect(() => {
        setActiveSection(sectionFromHash(location.hash));
    }, [location.hash]);

    useEffect(() => {
        let isMounted = true;

        void Promise.all([loadCloudUserProfile(), loadCloudUserPreferences()])
            .then(([profile, preferenceResult]) => {
                if (!isMounted) {
                    return;
                }

                if (profile) {
                    const nameParts = (profile.username ?? "").trim().split(/\s+/).filter(Boolean);
                    setSettings((current) => ({
                        ...current,
                        account: {
                            ...current.account,
                            firstName: nameParts[0] ?? "",
                            lastName: nameParts.slice(1).join(" "),
                            username: profile.username ?? "",
                            email: profile.email
                        }
                    }));
                }

                if (preferenceResult) {
                    setCloudUserId(preferenceResult.userId);
                    const preferences = preferenceResult.preferences;
                    setSettings((current) => ({
                        ...current,
                        notifications: {
                            weeklyDigest: preferences.weeklyDigest,
                            itineraryReminders: preferences.itineraryReminders,
                            featureAnnouncements: preferences.featureAnnouncements
                        },
                        app: {
                            theme: preferences.theme,
                            language: preferences.language,
                            mapAutoRotate: preferences.mapAutoRotate,
                            compactCards: preferences.compactCards
                        }
                    }));
                }

                setIsHydrated(true);
                setSettingsError(null);
            })
            .catch((error: unknown) => {
                if (isMounted) {
                    setIsHydrated(true);
                    setSettingsError(error instanceof Error ? error.message : "Unable to load your settings.");
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (!isHydrated) {
            return;
        }

        if (!cloudUserId) {
            return;
        }

        const notifications: CloudUserPreferences = {
            ...settings.notifications,
            ...settings.app
        };
        void saveCloudUserSettings(cloudUserId, {
            username: settings.account.username.trim(),
            notifications
        }).catch((error: unknown) => {
            setSettingsError(error instanceof Error ? error.message : "Unable to save your settings.");
        });
    }, [cloudUserId, isHydrated, settings]);

    // Keep the scroll button clear of the footer overlap area.
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

    const accountName = useMemo(
        () => `${settings.account.firstName} ${settings.account.lastName}`.trim() || "Traveler",
        [settings.account.firstName, settings.account.lastName]
    );

    return (
        <section className="mx-auto w-full max-w-[min(95vw,1380px)] px-[max(1.25rem,5%)] py-[max(2rem,6vh)] text-[#50300d]" aria-labelledby="settings-title">
            <div className="overflow-hidden rounded-[1.35rem] border border-[#8f5a20]/25 bg-[#f8f4ee]/85 shadow-[0_18px_42px_rgb(80_48_13_/_13%)] transition-all">
                <div
                    className="atlas-header relative flex min-h-[19rem] items-end bg-[#5a392b] px-6 py-7 text-[#ffead4] sm:min-h-[24rem] sm:px-9"
                    onClick={() => heroPhoto && requestUnsplashDownload(heroPhoto)}
                    style={{ backgroundImage: `linear-gradient(90deg, rgb(39 35 31 / 86%), rgb(39 35 31 / 32%)), linear-gradient(0deg, rgb(39 35 31 / 48%), transparent 65%), url(${heroPhoto?.urls.regular ?? "https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=1800&q=85"})`, backgroundSize: "cover", backgroundPosition: "center 55%" }}
                >
                    <div className="relative z-10">
                    <p className="m-0 font-[Adamina] text-[0.7rem] uppercase tracking-[0.24em] text-[#f6d7b5]">Your travel journal</p>
                        <h1 id="settings-title" className="mt-3 font-[Cormorant_Garamond] text-[clamp(2.8rem,7vw,5.4rem)] leading-[0.9] text-[#fff4e7]">
                        Settings
                    </h1>
                    <p className="mt-3 max-w-[42rem] font-[Cormorant_Garamond] text-[1.15rem] leading-[1.35] text-[#f7dfca]">
                        Shape your account, notifications, and journal preferences.
                    </p>
                    <UnsplashAttribution photo={heroPhoto} />
                    </div>
                </div>

                <div className="grid gap-7 bg-[#5a392b]/95 px-4 py-5 sm:px-7 sm:py-7 lg:grid-cols-[20rem_minmax(0,1fr)]">
                    <aside className="order-2 rounded-[1rem] border border-[#eab681]/35 bg-[#ffead41f] p-4 shadow-[inset_0_1px_0_#ffffff2b,0_10px_28px_rgb(0_0_0_/_30%)] lg:order-1">
                        <p className="font-[Adamina] text-[0.7rem] uppercase tracking-[0.2em] text-[#f6d7b5]">Settings menu</p>
                        <nav className="mt-3 flex flex-col gap-1.5" aria-label="Settings categories">
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    type="button"
                                    onClick={() => navigate(`/settings#${section.id}`)}
                                    className={`w-full rounded-[0.9rem] px-3 py-2.5 text-left transition ${
                                        activeSection === section.id
                                            ? "border border-[#eab681]/60 bg-[#cf8d45]/30 shadow-[0_4px_12px_rgb(0_0_0_/_15%)]"
                                            : "border border-transparent hover:border-[#eab681]/40 hover:bg-[#ffead40d]"
                                    }`}
                                >
                                    <p className="m-0 font-[Adamina] text-[0.92rem] text-[#fff4e7]">{section.label}</p>
                                    <p className="mt-1 m-0 font-[Cormorant_Garamond] text-[1rem] leading-[1.25] text-[#f7dfca]">{section.description}</p>
                                </button>
                            ))}
                        </nav>
                    </aside>

                    <div className="order-1 space-y-5 lg:order-2">
                        {activeSection === "account" && (
                            <article id="account" className="rounded-[1rem] border border-[#eab681]/35 bg-[#ffead41f] p-5 shadow-[inset_0_1px_0_#ffffff2b,0_10px_28px_rgb(0_0_0_/_30%)]">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <h2 className="font-[Adamina] text-[1.4rem] text-[#fff4e7]">User account settings</h2>
                                    <p className="font-[Cormorant_Garamond] text-[1.05rem] text-[#f7dfca]">Signed in as {accountName}</p>
                                </div>
                                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                    <label className="block">
                                        <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#f6d7b5]">First name</span>
                                        <input value={settings.account.firstName} onChange={(event) => setSettings((prev) => ({ ...prev, account: { ...prev.account, firstName: fieldValue(event) } }))} className="w-full rounded-[0.7rem] border border-[#cf8d45]/55 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1.08rem] text-[#50300d] outline-none focus:border-[#7a3f00] focus:ring-2 focus:ring-[#cf8d45]/35" />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#f6d7b5]">Last name</span>
                                        <input value={settings.account.lastName} onChange={(event) => setSettings((prev) => ({ ...prev, account: { ...prev.account, lastName: fieldValue(event) } }))} className="w-full rounded-[0.7rem] border border-[#cf8d45]/55 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1.08rem] text-[#50300d] outline-none focus:border-[#7a3f00] focus:ring-2 focus:ring-[#cf8d45]/35" />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#f6d7b5]">Username</span>
                                        <input value={settings.account.username} onChange={(event) => setSettings((prev) => ({ ...prev, account: { ...prev.account, username: fieldValue(event) } }))} className="w-full rounded-[0.7rem] border border-[#cf8d45]/55 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1.08rem] text-[#50300d] outline-none focus:border-[#7a3f00] focus:ring-2 focus:ring-[#cf8d45]/35" />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#f6d7b5]">Primary email</span>
                                        <input type="email" value={settings.account.email} onChange={(event) => setSettings((prev) => ({ ...prev, account: { ...prev.account, email: fieldValue(event) } }))} className="w-full rounded-[0.7rem] border border-[#cf8d45]/55 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1.08rem] text-[#50300d] outline-none focus:border-[#7a3f00] focus:ring-2 focus:ring-[#cf8d45]/35" />
                                    </label>
                                    <label className="block sm:col-span-2">
                                        <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#f6d7b5]">Secondary email</span>
                                        <input type="email" value={settings.account.secondaryEmail} onChange={(event) => setSettings((prev) => ({ ...prev, account: { ...prev.account, secondaryEmail: fieldValue(event) } }))} placeholder="Optional backup email" className="w-full rounded-[0.7rem] border border-[#cf8d45]/55 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1.08rem] text-[#50300d] outline-none focus:border-[#7a3f00] focus:ring-2 focus:ring-[#cf8d45]/35" />
                                    </label>
                                </div>
                                {settingsError && (
                                    <p className="mt-4 rounded-[0.7rem] border border-[#b16a55]/45 bg-[#fff4e7] px-4 py-3 font-[Cormorant_Garamond] text-[#8d3324]">
                                        {settingsError}
                                    </p>
                                )}
                            </article>
                        )}

                        {activeSection === "notifications" && (
                            <article id="notifications" className="rounded-[1rem] border border-[#eab681]/35 bg-[#ffead41f] p-5 shadow-[inset_0_1px_0_#ffffff2b,0_10px_28px_rgb(0_0_0_/_30%)]">
                                <h2 className="font-[Adamina] text-[1.4rem] text-[#fff4e7]">Notifications</h2>
                                <p className="mt-2 font-[Cormorant_Garamond] text-[1.1rem] text-[#f7dfca]">Choose what reaches your inbox.</p>
                                <div className="mt-5 space-y-3">
                                    <label className="flex items-center justify-between gap-3 rounded-[0.8rem] border border-[#cf8d45]/30 bg-[#ffead4]/60 px-4 py-3">
                                        <span className="font-[Cormorant_Garamond] text-[1.15rem] text-[#50300d]">Weekly travel digest</span>
                                        <input type="checkbox" checked={settings.notifications.weeklyDigest} onChange={(event) => setSettings((prev) => ({ ...prev, notifications: { ...prev.notifications, weeklyDigest: event.target.checked } }))} className="h-4 w-4 accent-[#7a3f00]" />
                                    </label>
                                    <label className="flex items-center justify-between gap-3 rounded-[0.8rem] border border-[#cf8d45]/30 bg-[#ffead4]/60 px-4 py-3">
                                        <span className="font-[Cormorant_Garamond] text-[1.15rem] text-[#50300d]">Itinerary reminders</span>
                                        <input type="checkbox" checked={settings.notifications.itineraryReminders} onChange={(event) => setSettings((prev) => ({ ...prev, notifications: { ...prev.notifications, itineraryReminders: event.target.checked } }))} className="h-4 w-4 accent-[#7a3f00]" />
                                    </label>
                                    <label className="flex items-center justify-between gap-3 rounded-[0.8rem] border border-[#cf8d45]/30 bg-[#ffead4]/60 px-4 py-3">
                                        <span className="font-[Cormorant_Garamond] text-[1.15rem] text-[#50300d]">Feature announcements</span>
                                        <input type="checkbox" checked={settings.notifications.featureAnnouncements} onChange={(event) => setSettings((prev) => ({ ...prev, notifications: { ...prev.notifications, featureAnnouncements: event.target.checked } }))} className="h-4 w-4 accent-[#7a3f00]" />
                                    </label>
                                    {/*
                                    <label className="flex items-center justify-between gap-3 rounded-[0.8rem] border border-[#cf8d45]/30 bg-[#ffead4]/60 px-4 py-3">
                                        <span className="font-[Cormorant_Garamond] text-[1.15rem] text-[#50300d]">Payment and subscription alerts</span>
                                        <input type="checkbox" checked={settings.notifications.paymentAlerts} onChange={(event) => setSettings((prev) => ({ ...prev, notifications: { ...prev.notifications, paymentAlerts: event.target.checked } }))} className="h-4 w-4 accent-[#7a3f00]" />
                                    </label>
                                    */}
                                </div>
                            </article>
                        )}

                        {/* {activeSection === "premium" && (
                            <article id="about" className="rounded-[1rem] border border-[#eab681]/35 bg-[#ffead41f] p-5 shadow-[inset_0_1px_0_#ffffff2b,0_10px_28px_rgb(0_0_0_/_30%)]">
                                    <PremiumPlans />
                            </article>
                        )} */}

                        {activeSection === "about" && (
                            <article className="rounded-[1rem] border border-[#eab681]/35 bg-[#ffead41f] p-5 shadow-[inset_0_1px_0_#ffffff2b,0_10px_28px_rgb(0_0_0_/_30%)]">
                                <h2 className="font-[Adamina] text-[1.4rem] text-[#fff4e7]">About app and policies</h2>
                                <p className="mt-2 font-[Cormorant_Garamond] text-[1.1rem] text-[#f7dfca]">
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

                                {/* <div className="mt-6 grid gap-4 rounded-[0.9rem] border border-[#cf8d45]/30 bg-[#ffead4]/60 p-4 sm:grid-cols-2">
                                    <label className="block">
                                        <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#f6d7b5]">Theme</span>
                                        <select value={settings.app.theme} onChange={(event) => setSettings((prev) => ({ ...prev, app: { ...prev.app, theme: event.target.value as AppSettings["theme"] } }))} className="w-full rounded-[0.7rem] border border-[#cf8d45]/55 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1.08rem] text-[#50300d] outline-none focus:border-[#7a3f00] focus:ring-2 focus:ring-[#cf8d45]/35">
                                            <option value="heritage">Heritage brown</option>
                                            <option value="modern-preview">Modern grey preview</option>
                                        </select>
                                    </label>
                                    <label className="block">
                                        <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#f6d7b5]">Language</span>
                                        <select value={settings.app.language} onChange={(event) => setSettings((prev) => ({ ...prev, app: { ...prev.app, language: event.target.value as AppSettings["language"] } }))} className="w-full rounded-[0.7rem] border border-[#cf8d45]/55 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1.08rem] text-[#50300d] outline-none focus:border-[#7a3f00] focus:ring-2 focus:ring-[#cf8d45]/35">
                                            <option value="english">English</option>
                                            <option value="polish">Polski</option>
                                        </select>
                                    </label>
                                    <label className="flex items-center justify-between gap-3 rounded-[0.8rem] border border-[#cf8d45]/30 bg-[#fff7ee] px-4 py-3">
                                        <span className="font-[Cormorant_Garamond] text-[1.12rem] text-[#50300d]">Map auto-rotate</span>
                                        <input type="checkbox" checked={settings.app.mapAutoRotate} onChange={(event) => setSettings((prev) => ({ ...prev, app: { ...prev.app, mapAutoRotate: event.target.checked } }))} className="h-4 w-4 accent-[#7a3f00]" />
                                    </label>
                                    <label className="flex items-center justify-between gap-3 rounded-[0.8rem] border border-[#cf8d45]/30 bg-[#fff7ee] px-4 py-3">
                                        <span className="font-[Cormorant_Garamond] text-[1.12rem] text-[#50300d]">Compact cards</span>
                                        <input type="checkbox" checked={settings.app.compactCards} onChange={(event) => setSettings((prev) => ({ ...prev, app: { ...prev.app, compactCards: event.target.checked } }))} className="h-4 w-4 accent-[#7a3f00]" />
                                    </label>
                                </div> */}
                            </article>
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
