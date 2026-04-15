import { Suspense, lazy, useMemo, useState } from "react";
import { getCountryName, type CountriesGeoJson } from "../types/countries";

const Map = lazy(() => import("../components/Map"));

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
            <section
                className="mx-auto my-4 w-[min(95vw,1400px)] rounded-[0.8rem] border border-[#eab681] bg-white p-4 shadow-[0_3px_14px_rgb(80_48_13_/_15%)]"
                aria-label="Country filters"
            >
                <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search countries"
                    className="w-full rounded-[0.6rem] border border-[#eab681] bg-white px-[0.8rem] py-[0.65rem] font-[Cormorant_Garamond] text-[1.1rem] text-[#50300d] outline-offset-2 focus:outline focus:outline-2 focus:outline-[#eab681]"
                />
                {searchTerm.trim().length > 0 && (
                    <div
                        className="mt-[0.85rem] grid max-h-[220px] grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-y-[0.55rem] gap-x-[0.85rem] overflow-y-auto pr-[0.25rem]"
                        role="group"
                        aria-label="Countries to show on map"
                    >
                        {filteredCountryNames.length === 0 ? (
                            <p className="m-0 font-[Cormorant_Garamond] text-[1.1rem] text-[#50300d]">No countries found.</p>
                        ) : (
                            filteredCountryNames.map((countryName) => {
                                const isChecked = selectedCountries.includes(countryName);

                                return (
                                    <label
                                        key={countryName}
                                        className="inline-flex items-center gap-[0.45rem] font-[Cormorant_Garamond] text-[1.1rem] text-[#50300d]"
                                    >
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
                <Suspense
                    fallback={
                        <div className="h-[min(70vw,70vh)] w-[min(70vw,70vh)] rounded-full border border-[#eab681] bg-white/60" />
                    }
                >
                    <Map countriesData={countriesData} selectedCountries={selectedCountries} />
                </Suspense>
            </div>

            <section
                className="mx-auto my-4 grid w-[min(95vw,1400px)] grid-cols-[repeat(3,minmax(0,1fr))] gap-y-[0.55rem] gap-x-[0.85rem] rounded-[0.8rem] border border-[#eab681] bg-white p-4 shadow-[0_3px_14px_rgb(80_48_13_/_15%)]"
                aria-label="Selected country summary"
            >
                {sortedSummaryCountryNames.map((countryName) => {
                    const isChecked = selectedCountries.includes(countryName);

                    return (
                        <label
                            key={`summary-${countryName}`}
                            className={`inline-flex items-center gap-[0.45rem] font-[Cormorant_Garamond] text-[1.1rem] text-[#50300d] ${isChecked ? "" : "opacity-50"}`}
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