import { NavLink, Outlet } from "react-router-dom";

function MainLayout() {
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

            <footer className="app-footer">
                <p className="app-footer__text">TripJournal</p>
            </footer>
        </div>
    );
}

export default MainLayout;
