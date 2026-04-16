import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./components/MainLayout.tsx";

const Home = lazy(() => import("./pages/Home"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Profile = lazy(() => import("./pages/Profile"));
const SELECTED_COUNTRIES_CACHE_KEY = "tripjournal:selected-countries:v1";

function getCachedSelectedCountries(): string[] {
    try {
        const cachedSelectedCountries = localStorage.getItem(SELECTED_COUNTRIES_CACHE_KEY);
        if (!cachedSelectedCountries) {
            return [];
        }

        const parsedSelectedCountries = JSON.parse(cachedSelectedCountries);
        if (!Array.isArray(parsedSelectedCountries)) {
            return [];
        }

        const normalizedSelectedCountries = parsedSelectedCountries.filter(
            (country): country is string => typeof country === "string" && country.trim().length > 0
        );

        return [...new Set(normalizedSelectedCountries)];
    } catch {
        return [];
    }
}

function RouteFallback() {
    return <div className="h-20" />;
}

function App() {
    const [selectedCountries, setSelectedCountries] = useState<string[]>(() => getCachedSelectedCountries());

    useEffect(() => {
        try {
            localStorage.setItem(SELECTED_COUNTRIES_CACHE_KEY, JSON.stringify(selectedCountries));
        } catch {
            // Ignore cache write failures.
        }
    }, [selectedCountries]);

    const toggleCountry = (countryName: string) => {
        setSelectedCountries((prevSelected) => {
            if (prevSelected.includes(countryName)) {
                return prevSelected.filter((name) => name !== countryName);
            }

            return [...prevSelected, countryName];
        });
    };

    return (
        <Routes>
            <Route element={<MainLayout />}>
                <Route
                    path="/"
                    element={
                        <Suspense fallback={<RouteFallback />}>
                            <Home selectedCountries={selectedCountries} toggleCountry={toggleCountry} />
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
                        <Home selectedCountries={selectedCountries} toggleCountry={toggleCountry} />
                    </Suspense>
                }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;