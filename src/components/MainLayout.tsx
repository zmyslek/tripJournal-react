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
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et
                            dolore magna aliqua.
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
                className="flex justify-center px-5 py-3.5"
                style={{ backgroundImage: `url(${leatherBackground})`, backgroundSize: "cover", backgroundPosition: "center" }}
            >
                <p className="m-0 font-[Adamina] text-[1.05rem] text-[#ffead4]">TripJournal</p>
            </footer>
        </div>
    );
}

export default MainLayout;
