import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./components/MainLayout.tsx";

const Home = lazy(() => import("./pages/Home.tsx"));
const Welcome = lazy(() => import("./pages/Welcome"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const Policies = lazy(() => import("./pages/Policies"));
const CountryTrips = lazy(() => import("./pages/CountryTrips"));
const Itineraries = lazy(() => import("./pages/Itineraries"));
const COUNTRY_STATUS_CACHE_KEY = "tripjournal:country-statuses:v1";
const COUNTRY_ADDED_CACHE_KEY = "tripjournal:country-added-dates:v1";

export type CountryStatus = "want-to-go" | "visited" | "want-to-visit-again";
type CountryStatusMap = Record<string, CountryStatus>;
type CountryAddedDateMap = Record<string, string>;

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

function getCachedCountryAddedDates(): CountryAddedDateMap {
    try {
        const cachedDates = localStorage.getItem(COUNTRY_ADDED_CACHE_KEY);
        if (!cachedDates) {
            return {};
        }

        const parsedDates = JSON.parse(cachedDates);
        if (!parsedDates || typeof parsedDates !== "object") {
            return {};
        }

        const normalizedDates: CountryAddedDateMap = {};
        Object.entries(parsedDates).forEach(([countryName, dateValue]) => {
            if (typeof countryName !== "string" || !countryName.trim()) {
                return;
            }

            if (typeof dateValue !== "string") {
                return;
            }

            const parsedDate = new Date(dateValue);
            if (Number.isNaN(parsedDate.getTime())) {
                return;
            }

            normalizedDates[countryName] = parsedDate.toISOString();
        });

        return normalizedDates;
    } catch {
        return {};
    }
}

function RouteFallback() {
    return <div className="h-20" />;
}

function App() {
    const [countryStatuses, setCountryStatuses] = useState<CountryStatusMap>(() => getCachedCountryStatuses());
    const [countryAddedDates, setCountryAddedDates] = useState<CountryAddedDateMap>(() => getCachedCountryAddedDates());

    useEffect(() => {
        try {
            localStorage.setItem(COUNTRY_STATUS_CACHE_KEY, JSON.stringify(countryStatuses));
        } catch {
            // Ignore cache write failures.
        }
    }, [countryStatuses]);

    useEffect(() => {
        try {
            localStorage.setItem(COUNTRY_ADDED_CACHE_KEY, JSON.stringify(countryAddedDates));
        } catch {
            // Ignore cache write failures.
        }
    }, [countryAddedDates]);

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

        setCountryAddedDates((prevDates) => {
            if (status === null) {
                const nextDates = { ...prevDates };
                delete nextDates[countryName];
                return nextDates;
            }

            if (prevDates[countryName]) {
                return prevDates;
            }

            return {
                ...prevDates,
                [countryName]: new Date().toISOString()
            };
        });
    };

    // Temporary compatibility with Home-codex: this page expects `visitedCountries`.
    const visitedCountries = Object.entries(countryStatuses)
        .filter(([, status]) => status === "visited" || status === "want-to-visit-again")
        .map(([countryName]) => countryName);

    return (
        <Routes>
            <Route
                path="/welcome"
                element={
                    <Suspense fallback={<RouteFallback />}>
                        <Welcome />
                    </Suspense>
                }
            />
            <Route element={<MainLayout />}>
                <Route
                    path="/countries"
                    element={
                        <Suspense fallback={<RouteFallback />}>
                            <Home
                                visitedCountries={visitedCountries}
                                countryStatuses={countryStatuses}
                                countryAddedDates={countryAddedDates}
                                setCountryStatus={setCountryStatus}
                            />
                        </Suspense>
                    }
                />
                <Route
                    path="/trips/:countryName"
                    element={
                        <Suspense fallback={<RouteFallback />}>
                            <CountryTrips countryStatuses={countryStatuses} />
                        </Suspense>
                    }
                />
                <Route
                    path="/itineraries/:countryName"
                    element={
                        <Suspense fallback={<RouteFallback />}>
                            <Itineraries
                                countryStatuses={countryStatuses}
                                countryAddedDates={countryAddedDates}
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
                    path="/settings"
                    element={
                        <Suspense fallback={<RouteFallback />}>
                            <Settings />
                        </Suspense>
                    }
                />
                <Route
                    path="/help-center"
                    element={
                        <Suspense fallback={<RouteFallback />}>
                            <HelpCenter />
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
                            countryAddedDates={countryAddedDates}
                            setCountryStatus={setCountryStatus}
                        />
                    </Suspense>
                }
            />

            <Route path="/" element={<Navigate to="/welcome" replace />} />
            <Route path="*" element={<Navigate to="/welcome" replace />} />
        </Routes>
    );
}

export default App;
