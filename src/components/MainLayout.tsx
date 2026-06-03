import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import leatherBackground from "../assets/dark-leather.jpg";
import paperBackground from "../assets/wrinkled-paper.png";
import { Settings, HelpCircle } from "lucide-react";
import { getStoredUserProfile } from "../types/user";
import { setPostHogConsent } from "../lib/posthog";

const COOKIE_CONSENT_KEY = "tripjournal:cookie-consent:v1";
const policyLinks = [
    { to: "/policies/privacy", label: "Privacy" },
    { to: "/policies/cookies", label: "Cookies" },
    { to: "/policies/terms", label: "Terms" },
    { to: "/policies/accessibility", label: "Accessibility" }
];

function getSavedCookieConsent(): "accepted" | "rejected" | null {
    try {
        const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
        return savedConsent === "accepted" || savedConsent === "rejected" ? savedConsent : null;
    } catch {
        return null;
    }
}

function MainLayout() {
    const [cookieConsent, setCookieConsent] = useState<"accepted" | "rejected" | null>(() => getSavedCookieConsent());

    useEffect(() => {
        if (cookieConsent === null) {
            return;
        }

        setPostHogConsent(cookieConsent === "accepted");

        try {
            localStorage.setItem(COOKIE_CONSENT_KEY, cookieConsent);
        } catch {
            // Ignore storage failures.
        }
    }, [cookieConsent]);

    return (
        <div className="flex min-h-screen w-full flex-col overflow-x-hidden">
                <nav
                    className="w-full max-w-full overflow-x-hidden box-border flex items-center justify-between gap-[max(1rem,4%)] px-[max(1.25rem,5%)] py-[max(0.875rem,2%)] max-sm:gap-2 max-sm:px-[max(0.875rem,3%)]"
                    style={{ backgroundImage: `url(${leatherBackground})`, backgroundSize: "cover", backgroundPosition: "center" }}
                >
                    <div className="min-w-0 flex-1 text-center">
                        <NavLink to="/countries" className="text-center font-[Adamina] text-[clamp(1.5rem,5vw,1.875rem)] leading-none font-normal text-[#ffead4] no-underline" aria-label="Countries">
                            TripJournal
                        </NavLink>
                    </div>
                    <div className="min-w-0 flex items-center justify-end gap-[max(0.75rem,3%)] max-sm:gap-1.5">
                    <NavLink
                        to="/countries"
                        className={({ isActive }) =>
                            `font-[Adamina] text-[clamp(0.875rem,2.5vw,1.5rem)] leading-[1.2] font-normal text-[#ffead4] no-underline transition ${isActive ? "underline underline-offset-[0.18em]" : ""}`
                        }
                    >
                        Countries
                    </NavLink>
                    <NavLink
                        to="/gallery"
                        className={({ isActive }) =>
                            `font-[Adamina] text-[clamp(0.875rem,2.5vw,1.5rem)] leading-[1.2] font-normal text-[#ffead4] no-underline transition ${isActive ? "underline underline-offset-[0.18em]" : ""}`
                        }
                    >
                        Gallery
                    </NavLink>
                    <NavLink
                        to="/profile"
                        className={({ isActive }) =>
                            `inline-flex h-[clamp(1.75rem,6vw,2.6rem)] w-[clamp(1.75rem,6vw,2.6rem)] items-center justify-center rounded-full bg-[linear-gradient(135deg,#cf8d45,#ffd6aa)] font-[Adamina] text-[clamp(0.7rem,1.5vw,0.95rem)] font-semibold tracking-[0.06em] text-[#50300d] no-underline shadow-[0_2px_8px_rgb(80_48_13_/_35%)] transition ${isActive ? "outline outline-2 outline-offset-2 outline-[#ffead4]" : ""}`
                        }
                        aria-label="Profile"
                        title="Profile"
                    >
                        {(() => {
                            try {
                                const user = getStoredUserProfile();
                                const name = user?.username || user?.email || '';
                                const parts = name.split(/\s+/).filter(Boolean);
                                if (parts.length === 0) return 'JD';
                                const initials = parts.slice(0,2).map(p => p[0]?.toUpperCase()).join('');
                                return initials || 'JD';
                            } catch {
                                return 'JD';
                            }
                        })()}
                    </NavLink>
                    <NavLink
                        to="/settings"
                        className={({ isActive }) =>
                            `inline-flex h-[2.4rem] w-[2.4rem] items-center justify-center rounded-full border border-transparent bg-[#5a392b] text-[#ffead4] no-underline transition hover:bg-[#7a3f00] ${isActive ? "outline outline-2 outline-offset-2 outline-[#ffead4]" : ""}`
                        }
                        aria-label="Settings"
                        title="Settings"
                    >
                        <Settings size={18} />
                    </NavLink>
                    <NavLink
                        to="/help-center"
                        className={({ isActive }) =>
                            `inline-flex h-[clamp(1.25rem,4vw,1.7rem)] w-[clamp(1.25rem,4vw,1.7rem)] items-center justify-center rounded-full border border-[#ffead4]/70 font-[Adamina] text-[clamp(0.6rem,1.2vw,0.78rem)] text-[#ffead4] no-underline transition hover:bg-[#ffead4]/12 ${isActive ? "bg-[#ffead4]/18 outline outline-2 outline-offset-2 outline-[#ffead4]" : ""}`
                        }
                        aria-label="Help Center"
                        title="Help Center"
                    >
                        <HelpCircle size={16} />
                    </NavLink>
                </div>
            </nav>

            <main
                className="flex-1 w-full overflow-x-hidden bg-no-repeat bg-center bg-fixed"
                style={{ backgroundImage: `url(${paperBackground})`, backgroundSize: "cover" }}
            >
                <Outlet />
            </main>

            {cookieConsent === null && (
                <section className="sticky bottom-0 z-20 mx-[max(1rem,4%)] mb-[max(1rem,2%)] mt-[max(0.75rem,1%)] flex items-center justify-between gap-[max(1rem,4%)] rounded-2xl border border-[#eab681] bg-[linear-gradient(180deg,rgb(248_227_198_/_98%),rgb(241_210_172_/_96%))] p-[max(1rem,3%)] shadow-[0_12px_28px_rgb(80_48_13_/_18%)] max-md:flex-col max-md:items-stretch" aria-label="Cookie consent notice">
                    <div className="min-w-0">
                        <p className="m-0 font-[Adamina] text-[clamp(1rem,2vw,1.1rem)] text-[#50300d]">Cookie notice</p>
                        <p className="mt-[max(0.375rem,1%)] m-0 font-[Cormorant_Garamond] text-[clamp(0.95rem,2vw,1.05rem)] leading-[1.35] text-[#50300d]">
                            TripJournal stores your cookie choice and country statuses in this browser. If you accept, it also uses
                            PostHog for product analytics and frontend error tracking. It does not use advertising cookies or tracking
                            pixels.
                            {" "}
                            <Link to="/policies/cookies" className="font-semibold text-[#7a3f00] underline underline-offset-2">
                                Read the cookie policy
                            </Link>
                            .
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-[max(0.625rem,2%)] max-md:justify-start">
                        <button
                            type="button"
                            className="cursor-pointer rounded-full border border-[#eab681] bg-[#8f5a20] px-[max(1rem,3%)] py-[max(0.5rem,1.2%)] font-[Adamina] text-[clamp(0.85rem,1.5vw,0.95rem)] text-[#ffe0c2] transition hover:-translate-y-px hover:shadow-[0_6px_14px_rgb(80_48_13_/_12%)]"
                            onClick={() => setCookieConsent("accepted")}
                        >
                            Accept
                        </button>
                        <button
                            type="button"
                            className="cursor-pointer rounded-full border border-[#eab681] bg-[#f6dfc1] px-[max(1rem,3%)] py-[max(0.5rem,1.2%)] font-[Adamina] text-[clamp(0.85rem,1.5vw,0.95rem)] text-[#50300d] transition hover:-translate-y-px hover:shadow-[0_6px_14px_rgb(80_48_13_/_12%)]"
                            onClick={() => setCookieConsent("rejected")}
                        >
                            Reject
                        </button>
                    </div>
                </section>
            )}

            <footer
                className="flex items-start justify-between gap-[max(2rem,8%)] px-[max(1.5rem,6%)] py-[max(1.5rem,4%)] shadow-[0_-10px_28px_rgb(35_18_8_/_18%)] max-sm:flex-col"
                style={{ backgroundImage: `url(${leatherBackground})`, backgroundSize: "cover", backgroundPosition: "center" }}
            >
                <div>
                    <p className="m-0 font-[Adamina] text-[clamp(1rem,2.5vw,1.15rem)] leading-none text-[#ffead4]">
                        <span aria-hidden="true">&copy;</span> 2026 TripJournal
                    </p>
                    <p className="mt-[max(0.5rem,1%)] m-0 max-w-[18rem] font-[Cormorant_Garamond] text-[clamp(0.9rem,1.8vw,1rem)] leading-[1.25] text-[#f6d7b5]">
                        A quiet place for maps, memories, and future routes.
                    </p>
                </div>
                <nav className="flex min-w-[10rem] flex-col items-end gap-[max(0.25rem,0.5%)] max-sm:items-start" aria-label="Policies">
                    <div className="mb-[max(0.25rem,0.5%)] flex items-center gap-[max(0.5rem,1%)]">
                        <p className="m-0 font-[Adamina] text-[clamp(0.5rem,1vw,0.58rem)] uppercase tracking-[0.2em] text-[#f6d7b5]">Policies</p>
                        <div className="flex items-center gap-2">
                            <Link
                                to="/settings"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent bg-[#5a392b] text-[#ffead4] no-underline transition hover:bg-[#7a3f00]"
                                aria-label="Settings"
                                title="Settings"
                            >
                                <Settings size={16} />
                            </Link>
                            <Link
                                to="/help-center"
                                className="inline-flex h-[clamp(1.25rem,3vw,1.5rem)] w-[clamp(1.25rem,3vw,1.5rem)] items-center justify-center rounded-full border border-[#ffead4]/65 font-[Adamina] text-[clamp(0.65rem,1.2vw,0.76rem)] text-[#ffead4] no-underline transition hover:bg-[#ffead4]/12"
                                aria-label="Help Center"
                                title="Help Center"
                            >
                                <HelpCircle size={14} />
                            </Link>
                        </div>
                    </div>
                    {policyLinks.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className="font-[Adamina] text-[clamp(0.65rem,1.2vw,0.78rem)] leading-[1.4] text-[#ffead4] no-underline opacity-90 transition hover:translate-x-[-0.15rem] hover:opacity-100 hover:underline hover:underline-offset-[0.2em] max-sm:hover:translate-x-[0.15rem]"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>
            </footer>
        </div>
    );
}

export default MainLayout;
