import { useMemo, useState } from "react";
import Map from "../components/Map";
import { getCountryName, type CountriesGeoJson } from "../types/countries";

type HomeProps = {
    countriesData: CountriesGeoJson | null;
    selectedCountries: string[];
    toggleCountry: (countryName: string) => void;
};

function Home({ countriesData, selectedCountries, toggleCountry }: HomeProps) {
    const [searchTerm, setSearchTerm] = useState("");

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

    return (
        <>
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

export default Home;