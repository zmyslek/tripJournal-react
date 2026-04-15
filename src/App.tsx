import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import MainLayout from "./components/MainLayout.tsx";
import Gallery from "./pages/Gallery";
import Profile from "./pages/Profile";
import "./css/App.css";
import type { CountriesGeoJson } from "./types/countries";

function App() {
    const [countriesData, setCountriesData] = useState<CountriesGeoJson | null>(null);
    const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

    useEffect(() => {
        let isMounted = true;

        const loadCountries = async () => {
            try {
                const response = await fetch("/countries.geojson");
                if (!response.ok) {
                    throw new Error(`Failed to fetch countries.geojson: ${response.status}`);
                }

                const data = (await response.json()) as CountriesGeoJson;
                if (isMounted) {
                    setCountriesData(data);
                }
            } catch (error) {
                console.error("Failed to load countries GeoJSON", error);
            }
        };

        void loadCountries();

        return () => {
            isMounted = false;
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
                        <Home
                            countriesData={countriesData}
                            selectedCountries={selectedCountries}
                            toggleCountry={toggleCountry}
                        />
                    }
                />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/profile" element={<Profile />} />
            </Route>

            <Route
                path="/map-only"
                element={
                    <Home
                        countriesData={countriesData}
                        selectedCountries={selectedCountries}
                        toggleCountry={toggleCountry}
                    />
                }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;