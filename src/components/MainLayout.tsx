import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import leatherBackground from "../assets/dark-leather.jpg";
import paperBackground from "../assets/wrinkled-paper.png";

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

        try {
            localStorage.setItem(COOKIE_CONSENT_KEY, cookieConsent);
        } catch {
            // Ignore storage failures.
        }
    }, [cookieConsent]);

    return (
        <div className="min-h-screen flex flex-col">
            <nav
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-3.5"
                style={{ backgroundImage: `url(${leatherBackground})`, backgroundSize: "cover", backgroundPosition: "center" }}
            >
                <div aria-hidden="true" />
                <NavLink to="/" className="col-start-2 text-center font-[Adamina] text-[1.875rem] leading-none font-normal text-[#ffead4] no-underline" aria-label="Home">
                    TripJournal
                </NavLink>
                <div className="col-start-3 flex items-center justify-self-end gap-5">
                    <NavLink
                        to="/gallery"
                        className={({ isActive }) =>
                            `font-[Adamina] text-[1.5rem] leading-[1.2] font-normal text-[#ffead4] no-underline ${isActive ? "underline underline-offset-[0.18em]" : ""}`
                        }
                    >
                        Gallery
                    </NavLink>
                    <NavLink
                        to="/profile"
                        className={({ isActive }) =>
                            `inline-flex h-[2.6rem] w-[2.6rem] items-center justify-center rounded-full bg-[linear-gradient(135deg,#cf8d45,#ffd6aa)] font-[Adamina] text-[0.95rem] font-semibold tracking-[0.06em] text-[#50300d] no-underline shadow-[0_2px_8px_rgb(80_48_13_/_35%)] ${isActive ? "outline outline-2 outline-offset-2 outline-[#ffead4]" : ""}`
                        }
                        aria-label="Profile"
                    >
                        TJ
                    </NavLink>
                </div>
            </nav>

            <main
                className="flex-1 bg-no-repeat bg-center bg-fixed"
                style={{ backgroundImage: `url(${paperBackground})`, backgroundSize: "cover" }}
            >
                <Outlet />
            </main>

            {cookieConsent === null && (
                <section className="sticky bottom-0 z-20 mx-4 mb-4 mt-3 flex items-center justify-between gap-4 rounded-2xl border border-[#eab681] bg-[linear-gradient(180deg,rgb(248_227_198_/_98%),rgb(241_210_172_/_96%))] p-4 shadow-[0_12px_28px_rgb(80_48_13_/_18%)] max-md:flex-col max-md:items-stretch" aria-label="Cookie consent notice">
                    <div className="min-w-0">
                        <p className="m-0 font-[Adamina] text-[1.1rem] text-[#50300d]">Cookie notice</p>
                        <p className="mt-1.5 m-0 font-[Cormorant_Garamond] text-[1.05rem] leading-[1.35] text-[#50300d]">
                            TripJournal stores your cookie choice and country statuses in this browser. It does not use advertising
                            cookies or tracking pixels.
                            {" "}
                            <Link to="/policies/cookies" className="font-semibold text-[#7a3f00] underline underline-offset-2">
                                Read the cookie policy
                            </Link>
                            .
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2.5 max-md:justify-start">
                        <button
                            type="button"
                            className="cursor-pointer rounded-full border border-[#eab681] bg-[#8f5a20] px-4 py-2 font-[Adamina] text-[0.95rem] text-[#ffe0c2] transition hover:-translate-y-px hover:shadow-[0_6px_14px_rgb(80_48_13_/_12%)]"
                            onClick={() => setCookieConsent("accepted")}
                        >
                            Accept
                        </button>
                        <button
                            type="button"
                            className="cursor-pointer rounded-full border border-[#eab681] bg-[#f6dfc1] px-4 py-2 font-[Adamina] text-[0.95rem] text-[#50300d] transition hover:-translate-y-px hover:shadow-[0_6px_14px_rgb(80_48_13_/_12%)]"
                            onClick={() => setCookieConsent("rejected")}
                        >
                            Reject
                        </button>
                    </div>
                </section>
            )}

            <footer
                className="flex items-start justify-between gap-8 px-6 py-6 shadow-[0_-10px_28px_rgb(35_18_8_/_18%)] max-sm:flex-col"
                style={{ backgroundImage: `url(${leatherBackground})`, backgroundSize: "cover", backgroundPosition: "center" }}
            >
                <div>
                    <p className="m-0 font-[Adamina] text-[1.15rem] leading-none text-[#ffead4]">
                        <span aria-hidden="true">&copy;</span> 2026 TripJournal
                    </p>
                    <p className="mt-2 m-0 max-w-[18rem] font-[Cormorant_Garamond] text-[1rem] leading-[1.25] text-[#f6d7b5]">
                        A quiet place for maps, memories, and future routes.
                    </p>
                </div>
                <nav className="flex min-w-[10rem] flex-col items-end gap-1 max-sm:items-start" aria-label="Policies">
                    <p className="mb-1 m-0 font-[Adamina] text-[0.58rem] uppercase tracking-[0.2em] text-[#f6d7b5]">Policies</p>
                    {policyLinks.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className="font-[Adamina] text-[0.78rem] leading-[1.4] text-[#ffead4] no-underline opacity-90 transition hover:translate-x-[-0.15rem] hover:opacity-100 hover:underline hover:underline-offset-[0.2em] max-sm:hover:translate-x-[0.15rem]"
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
