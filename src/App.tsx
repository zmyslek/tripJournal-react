import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./components/MainLayout.tsx";
import "./css/App.css";
import type { CountriesGeoJson } from "./types/countries";

const Home = lazy(() => import("./pages/Home"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Profile = lazy(() => import("./pages/Profile"));
const COUNTRIES_CACHE_KEY = "tripjournal:countries:v1";

function RouteFallback() {
    return <div className="h-20" />;
}

function App() {
    const [countriesData, setCountriesData] = useState<CountriesGeoJson | null>(null);
    const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

    useEffect(() => {
        let isMounted = true;
        const abortController = new AbortController();

        try {
            const cachedValue = localStorage.getItem(COUNTRIES_CACHE_KEY);
            if (cachedValue) {
                const parsedCached = JSON.parse(cachedValue) as CountriesGeoJson;
                setCountriesData(parsedCached);
            }
        } catch {
            // Ignore cache parse/storage failures and continue with network fetch.
        }

        const loadCountries = async () => {
            try {
                const response = await fetch(`${import.meta.env.BASE_URL}countries.geojson`, {
                    cache: "force-cache",
                    signal: abortController.signal
                });
                if (!response.ok) {
                    throw new Error(`Failed to fetch countries.geojson: ${response.status}`);
                }

                const data = (await response.json()) as CountriesGeoJson;
                if (isMounted) {
                    setCountriesData(data);
                }

                try {
                    localStorage.setItem(COUNTRIES_CACHE_KEY, JSON.stringify(data));
                } catch {
                    // Ignore cache write failures.
                }
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") {
                    return;
                }
                console.error("Failed to load countries GeoJSON", error);
            }
        };

        void loadCountries();

        return () => {
            isMounted = false;
            abortController.abort();
        };
    }, []);

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
                            <Home
                                countriesData={countriesData}
                                selectedCountries={selectedCountries}
                                toggleCountry={toggleCountry}
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
                            countriesData={countriesData}
                            selectedCountries={selectedCountries}
                            toggleCountry={toggleCountry}
                        />
                    </Suspense>
                }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;