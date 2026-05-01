import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./components/MainLayout.tsx";

const Home = lazy(() => import("./pages/Home.tsx"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Profile = lazy(() => import("./pages/Profile"));
const Policies = lazy(() => import("./pages/Policies"));
const COUNTRY_STATUS_CACHE_KEY = "tripjournal:country-statuses:v1";

export type CountryStatus = "want-to-go" | "visited" | "want-to-visit-again";
type CountryStatusMap = Record<string, CountryStatus>;

function getCachedCountryStatuses(): CountryStatusMap {
    try {
        const cachedStatuses = localStorage.getItem(COUNTRY_STATUS_CACHE_KEY);
        if (!cachedStatuses) {
            return {};
        }

        const parsedStatuses = JSON.parse(cachedStatuses);
        if (!parsedStatuses || typeof parsedStatuses !== "object") {
            return {};
        }

        const normalizedStatuses: CountryStatusMap = {};

        Object.entries(parsedStatuses).forEach(([countryName, statusValue]) => {
            if (typeof countryName !== "string" || countryName.trim().length === 0) {
                return;
            }

            if (statusValue === "want-to-go" || statusValue === "visited" || statusValue === "want-to-visit-again") {
                normalizedStatuses[countryName] = statusValue;
            }
        });

        return normalizedStatuses;
    } catch {
        return {};
    }
}

function RouteFallback() {
    return <div className="h-20" />;
}

function App() {
    const [countryStatuses, setCountryStatuses] = useState<CountryStatusMap>(() => getCachedCountryStatuses());

    useEffect(() => {
        try {
            localStorage.setItem(COUNTRY_STATUS_CACHE_KEY, JSON.stringify(countryStatuses));
        } catch {
            // Ignore cache write failures.
        }
    }, [countryStatuses]);

    const setCountryStatus = (countryName: string, status: CountryStatus | null) => {
        setCountryStatuses((prevStatuses) => {
            if (status === null) {
                const nextStatuses = { ...prevStatuses };
                delete nextStatuses[countryName];
                return nextStatuses;
            }

            return {
                ...prevStatuses,
                [countryName]: status
            };
        });
    };

    // Temporary compatibility with Home-codex: this page expects `visitedCountries`.
    // const selectedCountries = Object.entries(countryStatuses)
    const visitedCountries = Object.entries(countryStatuses)
        .filter(([, status]) => status === "visited" || status === "want-to-visit-again")
        .map(([countryName]) => countryName);

    return (
        <Routes>
            <Route element={<MainLayout />}>
                <Route
                    path="/"
                    element={
                        <Suspense fallback={<RouteFallback />}>
                            <Home
                                visitedCountries={visitedCountries}
                                countryStatuses={countryStatuses}
                                setCountryStatus={setCountryStatus}
                            />
                        </Suspense>
                    }
                />
                <Route
                    path="/gallery"
                    element={
                        <Suspense fallback={<RouteFallback />}>
                            <Gallery />
                        </Suspense>
                    }
                />
                <Route
                    path="/profile"
                    element={
                        <Suspense fallback={<RouteFallback />}>
                            <Profile />
                        </Suspense>
                    }
                />
                <Route
                    path="/policies/:policySlug"
                    element={
                        <Suspense fallback={<RouteFallback />}>
                            <Policies />
                        </Suspense>
                    }
                />
            </Route>

            <Route
                path="/map-only"
                element={
                    <Suspense fallback={<RouteFallback />}>
                        <Home
                            visitedCountries={visitedCountries}
                            countryStatuses={countryStatuses}
                            setCountryStatus={setCountryStatus}
                        />
                    </Suspense>
                }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
