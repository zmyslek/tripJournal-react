import { Suspense, lazy, useMemo, useState } from "react";
import { getCountryName } from "../types/countries";
import { useCountriesData } from "../hooks/useCountriesData";

const Map = lazy(() => import("../components/Map"));

type HomeProps = {
    selectedCountries: string[];
    toggleCountry: (countryName: string) => void;
};

function Home({ selectedCountries, toggleCountry }: HomeProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [mapViewMode, setMapViewMode] = useState<"globe" | "map">("globe");
    const { countriesData, isLoading, error } = useCountriesData();

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
            <section className="mx-auto my-4 w-[min(95vw,1400px)] rounded-[0.8rem] border border-[#eab681] bg-white p-4 shadow-[0_3px_14px_rgb(80_48_13_/_15%)]" aria-label="Country filters">
                <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search countries"
                    className="w-full rounded-[0.6rem] border border-[#eab681] bg-white px-[0.8rem] py-[0.65rem] font-[Cormorant_Garamond] text-[1.1rem] text-[#50300d] outline-offset-2 focus:outline focus:outline-2 focus:outline-[#eab681]"
                />
                {error && (
                    <p className="mt-3 rounded-lg border border-[#eab681] bg-[#fff5e9] px-3 py-2 font-[Cormorant_Garamond] text-[1.05rem] text-[#50300d]">
                        {error}
                    </p>
                )}
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

            <div className="flex flex-col items-center justify-center gap-4 px-3 py-3 md:flex-row">
                {isLoading || !countriesData ? (
                    <div className="flex h-[min(70vw,70vh)] w-[min(70vw,70vh)] items-center justify-center rounded-full border border-[#eab681] bg-white/70 text-center font-[Cormorant_Garamond] text-[1.15rem] text-[#50300d] shadow-[0_3px_14px_rgb(80_48_13_/_12%)]">
                        Loading map data...
                    </div>
                ) : (
                    <Suspense
                        fallback={
                            <div className="h-[min(70vw,70vh)] w-[min(70vw,70vh)] rounded-full border border-[#eab681] bg-white/60" />
                        }
                    >
                        <Map countriesData={countriesData} selectedCountries={selectedCountries} viewMode={mapViewMode} />
                    </Suspense>
                )}

                <button
                    type="button"
                    onClick={() => setMapViewMode((prev) => (prev === "globe" ? "map" : "globe"))}
                    className="rounded-[0.7rem] border border-[#eab681] bg-white px-4 py-2 font-[Cormorant_Garamond] text-[1.1rem] text-[#50300d] shadow-[0_3px_10px_rgb(80_48_13_/_14%)] transition hover:bg-[#ffead4]"
                    aria-label="Switch between globe and flat map view"
                >
                    {mapViewMode === "globe" ? "Switch to Flat Map" : "Switch to Globe"}
                </button>
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