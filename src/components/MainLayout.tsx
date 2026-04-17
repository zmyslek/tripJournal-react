import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import leatherBackground from "../assets/dark-leather.jpg";
import paperBackground from "../assets/wrinkled-paper.png";

const COOKIE_CONSENT_KEY = "tripjournal:cookie-consent:v1";

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

        try {
            localStorage.setItem(COOKIE_CONSENT_KEY, cookieConsent);
        } catch {
            // Ignore storage failures.
        }
    }, [cookieConsent]);

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#f3debf] text-[#50300d]">
            <img
                src={paperBackground}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40"
            />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,245,230,0.82),rgba(244,225,194,0.72)_45%,rgba(232,197,150,0.52)_100%)]" />

            <div className="relative z-10 flex min-h-screen flex-col">
                <header className="px-4 pb-3 pt-4 sm:px-6 lg:px-8">
                    <div className="relative overflow-hidden rounded-[2rem] border border-[#eab681]/30 shadow-[0_18px_45px_rgba(90,57,43,0.22)]">
                        <img
                            src={leatherBackground}
                            alt=""
                            aria-hidden="true"
                            className="absolute inset-0 h-full w-full object-cover"
                        />
                        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(135deg,rgba(58,33,24,0.9),rgba(111,68,43,0.82))]" />
                        <nav className="relative flex flex-col gap-5 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8" aria-label="Primary">
                            <div className="space-y-2">
                                <NavLink to="/" className="inline-block font-[Adamina] text-[2rem] leading-none text-[#fff0dd] no-underline sm:text-[2.3rem]" aria-label="Home">
                                    TripJournal
                                </NavLink>
                                <p className="max-w-xl font-[Cormorant_Garamond] text-[1.1rem] leading-[1.1] text-[#f7dfca]">
                                    A tactile travel journal for building your own beautifully marked world map.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:justify-end">
                                <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1.5 backdrop-blur-sm">
                                    <NavLink
                                        to="/"
                                        end
                                        className={({ isActive }) =>
                                            `inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2 font-[Adamina] text-[0.92rem] uppercase tracking-[0.16em] no-underline transition ${isActive ? "bg-[#ffead4] text-[#5a392b] shadow-[0_6px_14px_rgba(31,18,12,0.2)]" : "text-[#fff0dd] hover:bg-white/10"}`
                                        }
                                    >
                                        Atlas
                                    </NavLink>
                                    <NavLink
                                        to="/gallery"
                                        className={({ isActive }) =>
                                            `inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2 font-[Adamina] text-[0.92rem] uppercase tracking-[0.16em] no-underline transition ${isActive ? "bg-[#ffead4] text-[#5a392b] shadow-[0_6px_14px_rgba(31,18,12,0.2)]" : "text-[#fff0dd] hover:bg-white/10"}`
                                        }
                                    >
                                        Gallery
                                    </NavLink>
                                </div>

                                <NavLink
                                    to="/profile"
                                    className={({ isActive }) =>
                                        `inline-flex min-h-[50px] items-center gap-3 self-start rounded-full border px-2.5 py-2 pr-4 no-underline transition ${isActive ? "border-[#ffead4]/70 bg-[#ffead4] text-[#5a392b]" : "border-white/15 bg-white/8 text-[#fff0dd] hover:bg-white/12"}`
                                    }
                                    aria-label="Profile"
                                >
                                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#cf8d45,#f7d6b4)] font-[Adamina] text-[0.95rem] tracking-[0.08em] text-[#50300d] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                                        TJ
                                    </span>
                                    <span className="font-[Adamina] text-[0.9rem] uppercase tracking-[0.16em]">Profile</span>
                                </NavLink>
                            </div>
                        </nav>
                    </div>
                </header>

                <main className="relative flex-1">
                    <Outlet />
                </main>

                {cookieConsent === null && (
                    <section className="sticky bottom-0 z-20 mx-4 mb-4 mt-2 sm:mx-6 lg:mx-8" aria-label="Cookie consent notice">
                        <div className="flex flex-col gap-4 rounded-[1.7rem] border border-[#cf8d45]/40 bg-[linear-gradient(180deg,rgba(255,244,226,0.98),rgba(243,221,190,0.96))] p-5 shadow-[0_20px_40px_rgba(90,57,43,0.16)] lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                                <p className="font-[Adamina] text-[1.05rem] text-[#50300d]">Cookie notice</p>
                                <p className="mt-1.5 max-w-3xl font-[Cormorant_Garamond] text-[1.15rem] leading-[1.15] text-[#6a4630]">
                                    TripJournal uses local storage to remember your country selections and basic experience preferences on this device.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2.5">
                                <button
                                    type="button"
                                    className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-[#7a3f00]/25 bg-[#5a392b] px-5 py-2 font-[Adamina] text-[0.9rem] uppercase tracking-[0.16em] text-[#ffead4] transition hover:-translate-y-px hover:bg-[#72452f] focus:outline-none focus:ring-2 focus:ring-[#eab681]/70"
                                    onClick={() => setCookieConsent("accepted")}
                                >
                                    Accept
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-[#7a3f00]/20 bg-white/55 px-5 py-2 font-[Adamina] text-[0.9rem] uppercase tracking-[0.16em] text-[#7a3f00] transition hover:-translate-y-px hover:bg-[#fff1df] focus:outline-none focus:ring-2 focus:ring-[#eab681]/70"
                                    onClick={() => setCookieConsent("rejected")}
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                <footer className="px-4 pb-4 pt-2 sm:px-6 lg:px-8">
                    <div className="relative overflow-hidden rounded-[1.7rem] border border-[#eab681]/25 px-5 py-4 shadow-[0_14px_34px_rgba(90,57,43,0.18)]">
                        <img
                            src={leatherBackground}
                            alt=""
                            aria-hidden="true"
                            className="absolute inset-0 h-full w-full object-cover"
                        />
                        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,rgba(58,33,24,0.92),rgba(111,68,43,0.82))]" />
                        <div className="relative flex flex-col gap-3 text-[#ffead4] sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="font-[Adamina] text-[1.05rem]">TripJournal</p>
                                <p className="mt-1 font-[Cormorant_Garamond] text-[1.02rem] text-[#f7dfca]">A warm atlas for the countries that shape your life.</p>
                            </div>
                            <p className="font-[Adamina] text-[0.82rem] uppercase tracking-[0.18em] text-[#f6d7b5]">Personal travel archive</p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}

export default MainLayout;
