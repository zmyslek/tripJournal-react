import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

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
        <div className="app-shell">
            <nav className="app-nav">
                <div className="app-nav__spacer" aria-hidden="true" />
                <NavLink to="/" className="app-nav__brand app-nav__link" aria-label="Home">
                    TripJournal
                </NavLink>
                <div className="app-nav__links">
                    <NavLink
                        to="/gallery"
                        className={({ isActive }) =>
                            `app-nav__item app-nav__link ${isActive ? "app-nav__item--active" : ""}`
                        }
                    >
                        Gallery
                    </NavLink>
                    <NavLink
                        to="/profile"
                        className={({ isActive }) =>
                            `profile-badge ${isActive ? "profile-badge--active" : ""}`
                        }
                        aria-label="Profile"
                    >
                        TJ
                    </NavLink>
                </div>
            </nav>

            <main className="app-main">
                <Outlet />
            </main>

            {cookieConsent === null && (
                <section className="cookie-banner" aria-label="Cookie consent notice">
                    <div className="cookie-banner__content">
                        <p className="cookie-banner__title">Cookie notice</p>
                        <p className="cookie-banner__text">
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et
                            dolore magna aliqua.
                        </p>
                    </div>
                    <div className="cookie-banner__actions">
                        <button
                            type="button"
                            className="cookie-banner__button cookie-banner__button--accept"
                            onClick={() => setCookieConsent("accepted")}
                        >
                            Accept
                        </button>
                        <button
                            type="button"
                            className="cookie-banner__button cookie-banner__button--reject"
                            onClick={() => setCookieConsent("rejected")}
                        >
                            Reject
                        </button>
                    </div>
                </section>
            )}

            <footer className="app-footer">
                <p className="app-footer__text">TripJournal</p>
            </footer>
        </div>
    );
}

export default MainLayout;
