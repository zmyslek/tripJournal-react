import { useEffect, useMemo, useState } from "react";
import Map from "./components/Map";
import "./css/App.css";
import { getCountryName, type CountriesGeoJson } from "./types/countries";

function App() {
    const [countriesData, setCountriesData] = useState<CountriesGeoJson | null>(null);
    const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

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

    const countryNames = useMemo(() => {
        if (!countriesData) {
            return [];
        }

        const names = countriesData.features
            .map(getCountryName)
            .filter((name) => name.length > 0);

        return [...new Set(names)].sort((a, b) => a.localeCompare(b));
    }, [countriesData]);

    const filteredCountryNames = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) {
            return [];
        }

        return countryNames.filter((countryName) =>
            countryName.toLowerCase().includes(query)
        );
    }, [countryNames, searchTerm]);

    const sortedSummaryCountryNames = useMemo(() => {
        const selectedSet = new Set(selectedCountries);

        const checkedCountries = countryNames.filter((countryName) => selectedSet.has(countryName));
        const uncheckedCountries = countryNames.filter((countryName) => !selectedSet.has(countryName));

        return [...checkedCountries, ...uncheckedCountries];
    }, [countryNames, selectedCountries]);

    const toggleCountry = (countryName: string) => {
        setSelectedCountries((prevSelected) => {
            if (prevSelected.includes(countryName)) {
                return prevSelected.filter((name) => name !== countryName);
            }

            return [...prevSelected, countryName];
        });
    };

    return (
        <>
            <nav className="app-nav">
                <div className="app-nav__spacer" aria-hidden="true" />
                <h1 className="app-nav__brand">TripJournal</h1>
                <div className="app-nav__links">
                    <h2 className="app-nav__item">Gallery</h2>
                    <div className="profile-badge" aria-label="Profile">
                        TJ
                    </div>
                </div>
            </nav>

            <section className="country-panel" aria-label="Country filters">
                <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search countries"
                    className="country-search"
                />
                {searchTerm.trim().length > 0 && (
                    <div className="country-list" role="group" aria-label="Countries to show on map">
                        {filteredCountryNames.length === 0 ? (
                            <p className="country-list__empty">No countries found.</p>
                        ) : (
                            filteredCountryNames.map((countryName) => {
                                const isChecked = selectedCountries.includes(countryName);

                                return (
                                    <label key={countryName} className="country-option">
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => toggleCountry(countryName)}
                                        />
                                        <span>{countryName}</span>
                                    </label>
                                );
                            })
                        )}
                    </div>
                )}
            </section>

            <div className="map-wrapper">
                <Map countriesData={countriesData} selectedCountries={selectedCountries} />
            </div>

            <section className="country-summary" aria-label="Selected country summary">
                {sortedSummaryCountryNames.map((countryName) => {
                    const isChecked = selectedCountries.includes(countryName);

                    return (
                        <label
                            key={`summary-${countryName}`}
                            className={`country-option ${isChecked ? "" : "country-option--dimmed"}`}
                        >
                            <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleCountry(countryName)}
                            />
                            <span>{countryName}</span>
                        </label>
                    );
                })}
            </section>
        </>
    );
}

export default App;