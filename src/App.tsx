import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./components/MainLayout.tsx";

const Home = lazy(() => import("./pages/Home.tsx"));
const Gallery = lazy(() => import("./pages/Gallery.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));

const COUNTRY_STATUS_CACHE_KEY = "tripjournal:country-statuses:v1";
const VISITED_COUNTRIES_CACHE_KEY = "tripjournal:selected-countries:v1";
const WISHLIST_COUNTRIES_CACHE_KEY = "tripjournal:wishlist-countries:v1";
const WISHLIST_CITIES_CACHE_KEY = "tripjournal:wishlist-cities:v1";

type CountryStatus = "want-to-go" | "visited" | "want-to-visit-again";

type CountryStatusMap = Record<string, CountryStatus>;

function readCachedStringArray(cacheKey: string): string[] {
    try {
        const cachedValue = localStorage.getItem(cacheKey);
        if (!cachedValue) {
            return [];
        }

        const parsedValue = JSON.parse(cachedValue);
        if (!Array.isArray(parsedValue)) {
            return [];
        }

        const normalizedValue = parsedValue
            .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
            .map((item) => item.trim());

        return [...new Set(normalizedValue)];
    } catch {
        return [];
    }
}

function readCachedCountryStatuses(): CountryStatusMap {
    try {
        const cachedValue = localStorage.getItem(COUNTRY_STATUS_CACHE_KEY);
        if (cachedValue) {
            const parsedValue = JSON.parse(cachedValue);
            if (parsedValue && typeof parsedValue === "object" && !Array.isArray(parsedValue)) {
                const entries = Object.entries(parsedValue as Record<string, unknown>)
                    .filter(
                        (entry): entry is [string, CountryStatus] =>
                            typeof entry[0] === "string"
                            && entry[0].trim().length > 0
                            && (entry[1] === "want-to-go" || entry[1] === "visited" || entry[1] === "want-to-visit-again")
                    )
                    .map(([countryName, status]) => [countryName.trim(), status] as const);

                if (entries.length > 0) {
                    return Object.fromEntries(entries);
                }
            }
        }
    } catch {
        // Fall back to legacy storage below.
    }

    const visitedCountries = readCachedStringArray(VISITED_COUNTRIES_CACHE_KEY);
    const wishlistCountries = readCachedStringArray(WISHLIST_COUNTRIES_CACHE_KEY);
    const wishlistCityCountries = readCachedStringArray(WISHLIST_CITIES_CACHE_KEY);
    const countryStatuses: CountryStatusMap = {};

    visitedCountries.forEach((countryName) => {
        countryStatuses[countryName] = "visited";
    });

    wishlistCountries.forEach((countryName) => {
        if (!countryStatuses[countryName]) {
            countryStatuses[countryName] = "want-to-go";
        }
    });

    wishlistCityCountries.forEach((countryName) => {
        if (!countryStatuses[countryName]) {
            countryStatuses[countryName] = "want-to-go";
        }
    });

    return countryStatuses;
}

function RouteFallback() {
    return <div className="mx-auto min-h-[240px] w-full max-w-[1380px] px-4 py-8 sm:px-6 lg:px-8" />;
}

function App() {
    const [countryStatuses, setCountryStatuses] = useState<CountryStatusMap>(() => readCachedCountryStatuses());

    useEffect(() => {
        try {
            localStorage.setItem(COUNTRY_STATUS_CACHE_KEY, JSON.stringify(countryStatuses));
        } catch {
            // Ignore cache write failures.
        }
    }, [countryStatuses]);

    const setCountryStatus = (countryName: string, status: CountryStatus | null) => {
        const normalizedCountry = countryName.trim();
        if (!normalizedCountry) {
            return;
        }

        setCountryStatuses((previousStatuses) => {
            const nextStatuses = { ...previousStatuses };

            if (status === null) {
                delete nextStatuses[normalizedCountry];
                return nextStatuses;
            }

            nextStatuses[normalizedCountry] = status;
            return nextStatuses;
        });
    };

    const visitedCountries = Object.entries(countryStatuses)
        .filter(([, status]) => status === "visited" || status === "want-to-visit-again")
        .map(([countryName]) => countryName)
        .sort((a, b) => a.localeCompare(b));

    return (
        <Routes>
            <Route element={<MainLayout />}>
                <Route
                    path="/"
                    element={
                        <Suspense fallback={<RouteFallback />}>
                            <Home
                                countryStatuses={countryStatuses}
                                setCountryStatus={setCountryStatus}
                                visitedCountries={visitedCountries}
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
            </Route>

            <Route
                path="/map-only"
                element={
                    <Suspense fallback={<RouteFallback />}>
                        <Home
                            countryStatuses={countryStatuses}
                            setCountryStatus={setCountryStatus}
                            visitedCountries={visitedCountries}
                        />
                    </Suspense>
                }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
