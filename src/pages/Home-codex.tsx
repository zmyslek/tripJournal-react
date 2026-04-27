import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useCountriesData } from "../hooks/useCountriesData";
import { getCountryName, type CountriesGeoJson, type CountryFeature } from "../types/countries";

const Map = lazy(() => import("../components/Map.tsx"));

export type CountryStatus = "want-to-go" | "visited" | "want-to-visit-again";

export type CountryStatusMap = Record<string, CountryStatus>;

export interface HomeProps {
    countryStatuses: CountryStatusMap;
    setCountryStatus: (countryName: string, status: CountryStatus | null) => void;
    visitedCountries: string[];
}

const pointInRing = (lng: number, lat: number, ring: number[][]) => {
    let inside = false;

    for (let index = 0, previousIndex = ring.length - 1; index < ring.length; previousIndex = index++) {
        const currentX = ring[index]?.[0] ?? 0;
        const currentY = ring[index]?.[1] ?? 0;
        const previousX = ring[previousIndex]?.[0] ?? 0;
        const previousY = ring[previousIndex]?.[1] ?? 0;

        const intersects = currentY > lat !== previousY > lat
            && lng < ((previousX - currentX) * (lat - currentY)) / ((previousY - currentY) || Number.EPSILON) + currentX;

        if (intersects) {
            inside = !inside;
        }
    }

    return inside;
};

const pointInPolygon = (lng: number, lat: number, polygon: number[][][]) => {
    if (polygon.length === 0) {
        return false;
    }

    if (!pointInRing(lng, lat, polygon[0] ?? [])) {
        return false;
    }

    for (let index = 1; index < polygon.length; index += 1) {
        if (pointInRing(lng, lat, polygon[index] ?? [])) {
            return false;
        }
    }

    return true;
};

const findCountryAtCoordinates = (countriesData: CountriesGeoJson, lng: number, lat: number) => {
    for (const feature of countriesData.features) {
        const geometry = (feature as CountryFeature).geometry;
        const countryName = getCountryName(feature);

        if (!countryName) {
            continue;
        }

        if (geometry?.type === "Polygon" && pointInPolygon(lng, lat, geometry.coordinates)) {
            return countryName;
        }

        if (geometry?.type === "MultiPolygon") {
            for (const polygon of geometry.coordinates) {
                if (pointInPolygon(lng, lat, polygon)) {
                    return countryName;
                }
            }
        }
    }

    return null;
};

function Home({ countryStatuses, setCountryStatus, visitedCountries }: HomeProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [mapViewMode, setMapViewMode] = useState<"globe" | "map">("globe");
    const [userLocation, setUserLocation] = useState<{ lng: number; lat: number } | null>(null);
    const autoSelectedLocationKeyRef = useRef<string | null>(null);
    const hasRequestedGeolocationRef = useRef(false);
    const { countriesData, isLoading, error } = useCountriesData();

    useEffect(() => {
        if (hasRequestedGeolocationRef.current || !navigator.geolocation) {
            return;
        }

        hasRequestedGeolocationRef.current = true;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    lng: position.coords.longitude,
                    lat: position.coords.latitude
                });
            },
            () => {
                // Ignore geolocation failures and continue without auto-selection.
            },
            {
                enableHighAccuracy: false,
                timeout: 4000,
                maximumAge: 600000
            }
        );
    }, []);

    useEffect(() => {
        if (!countriesData || !userLocation) {
            return;
        }

        const locationKey = `${userLocation.lng.toFixed(4)},${userLocation.lat.toFixed(4)}`;
        if (autoSelectedLocationKeyRef.current === locationKey) {
            return;
        }

        autoSelectedLocationKeyRef.current = locationKey;

        const countryName = findCountryAtCoordinates(countriesData, userLocation.lng, userLocation.lat);
        if (countryName && !visitedCountries.includes(countryName)) {
            setCountryStatus(countryName, "visited");
        }
    }, [countriesData, setCountryStatus, userLocation, visitedCountries]);

    const countryNames = useMemo(() => {
        if (!countriesData) {
            return [];
        }

        const names = countriesData.features
            .map(getCountryName)
            .filter((name) => name.length > 0);

        return [...new Set(names)].sort((leftCountry, rightCountry) => leftCountry.localeCompare(rightCountry));
    }, [countriesData]);

    const highlightedCountries = useMemo(() => {
        return countryNames.filter((countryName) => {
            const status = countryStatuses[countryName];
            return status === "visited" || status === "want-to-visit-again";
        });
    }, [countryNames, countryStatuses]);

    const filteredCountryNames = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) {
            return [];
        }

        return countryNames.filter((countryName) => countryName.toLowerCase().includes(query));
    }, [countryNames, searchTerm]);

    const statusCounts = useMemo(() => {
        const counts = {
            notInterested: 0,
            wantToGo: 0,
            visited: 0,
            wantToVisitAgain: 0
        };

        countryNames.forEach((countryName) => {
            const status = countryStatuses[countryName];

            if (status === "want-to-go") {
                counts.wantToGo += 1;
                return;
            }

            if (status === "visited") {
                counts.visited += 1;
                return;
            }

            if (status === "want-to-visit-again") {
                counts.wantToVisitAgain += 1;
                return;
            }

            counts.notInterested += 1;
        });

        return counts;
    }, [countryNames, countryStatuses]);

    const toggleCountryFromSearch = (countryName: string) => {
        const status = countryStatuses[countryName] ?? null;
        const isChecked = status === "visited" || status === "want-to-visit-again";

        if (isChecked) {
            setCountryStatus(countryName, null);
            return;
        }

        setCountryStatus(countryName, "visited");
    };

    return (
        <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-8 px-4 pb-14 pt-6 sm:px-6 lg:px-8">
            <section className="overflow-hidden rounded-[2rem] border border-[#7a3f00]/18 bg-[linear-gradient(135deg,#fff4e5f2,#f4debee0)] shadow-[0_24px_60px_#5a392b29]" aria-label="Country filters">
                <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:px-10 lg:py-8">
                    <div className="relative">
                        <div className="absolute left-0 top-0 h-20 w-20 rounded-full bg-[#eab681]/30 blur-3xl" aria-hidden="true" />
                        <div className="absolute bottom-4 left-20 h-24 w-24 rounded-full bg-[#7a3f00]/10 blur-3xl" aria-hidden="true" />
                        <div className="relative space-y-5">
                            <p className="inline-flex items-center rounded-full border border-[#7a3f00]/20 bg-white/55 px-4 py-1.5 font-[Adamina] text-[0.78rem] uppercase tracking-[0.28em] text-[#7a3f00]">
                                Search atlas
                            </p>
                            <div className="space-y-4">
                                <h1 className="max-w-3xl font-[Adamina] text-3xl leading-[1.05] text-[#50300d] sm:text-4xl">
                                    Search the catalog, assign a status, and review your travel footprint.
                                </h1>
                                <p className="max-w-2xl font-[Cormorant_Garamond] text-[1.25rem] leading-[1.2] text-[#6a4630]">
                                    Use the search bar to find countries quickly, then mark them and watch the map update with the same warm brown palette.
                                </p>
                            </div>
                        </div>
                    </div>

                    <aside className="rounded-[1.8rem] border border-[#7a3f00]/15 bg-[#5c3722eb] p-5 text-[#ffead4] shadow-[0_20px_40px_#5a392b38]">
                        <div className="flex h-full flex-col gap-5">
                            <div>
                                <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.22em] text-[#f6d7b5]">Trip setup</p>
                                <h2 className="mt-3 font-[Adamina] text-[1.7rem] leading-tight text-[#fff4e7]">Sort countries quickly, then explore the map.</h2>
                                <p className="mt-3 font-[Cormorant_Garamond] text-[1.18rem] leading-[1.2] text-[#f7dfca]">
                                    Search the catalog, assign a status, and use the globe or flat map to review your travel footprint.
                                </p>
                            </div>

                            <div className="rounded-[1.4rem] border border-[#eab681]/25 bg-[#ffead414] p-4 shadow-[inset_0_1px_0_#ffffff2b]">
                                <label className="block">
                                    <span className="mb-2 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.2em] text-[#f6d7b5]">Search countries</span>
                                    <input
                                        type="search"
                                        value={searchTerm}
                                        onChange={(event) => setSearchTerm(event.target.value)}
                                        placeholder="Search countries"
                                        className="w-full rounded-[0.75rem] border border-[#eab681]/70 bg-[#fff7ee] px-[0.9rem] py-[0.7rem] font-[Cormorant_Garamond] text-[1.15rem] text-[#50300d] outline-none transition focus:border-[#f6d7b5] focus:ring-2 focus:ring-[#eab681]/55"
                                    />
                                </label>

                                {searchTerm.trim().length > 0 && (
                                    <div
                                        className="mt-4 grid max-h-[220px] grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-y-2 gap-x-3 overflow-y-auto pr-1"
                                        role="group"
                                        aria-label="Countries to show on map"
                                    >
                                        {filteredCountryNames.length === 0 ? (
                                            <p className="m-0 font-[Cormorant_Garamond] text-[1.1rem] text-[#f7dfca]">No countries found.</p>
                                        ) : (
                                            filteredCountryNames.map((countryName) => {
                                                const status = countryStatuses[countryName] ?? null;
                                                const isChecked = status === "visited" || status === "want-to-visit-again";

                                                return (
                                                    <label
                                                        key={countryName}
                                                        className="inline-flex items-center gap-[0.45rem] font-[Cormorant_Garamond] text-[1.1rem] text-[#f7dfca]"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => toggleCountryFromSearch(countryName)}
                                                        />
                                                        <span>{countryName}</span>
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            </section>

            {error && (
                <section className="rounded-[1.4rem] border border-[#cf8d45]/50 bg-[#f7dfca] px-5 py-4 shadow-[0_10px_24px_#5a392b14]" aria-label="Map error">
                    <p className="font-[Adamina] text-[1rem] text-[#50300d]">Map data issue</p>
                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.18rem] text-[#6a4630]">{error}</p>
                </section>
            )}

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,1fr)]">
                <div className="mt-6 flex min-h-[420px] flex-col items-center justify-center gap-4">
                    {isLoading || !countriesData ? (
                        <div className="flex min-h-[420px] w-full max-w-[820px] items-center justify-center px-6 text-center font-[Cormorant_Garamond] text-[1.3rem] text-[#6a4630]">
                            Loading map data...
                        </div>
                    ) : (
                        <Suspense
                            fallback={
                                <div className="flex min-h-[420px] w-full max-w-[820px] items-center justify-center px-6 text-center font-[Cormorant_Garamond] text-[1.3rem] text-[#6a4630]">
                                    Loading map...
                                </div>
                            }
                        >
                            <div className="w-full max-w-[820px]">
                                <Map
                                    countriesData={countriesData}
                                    selectedCountries={highlightedCountries}
                                    viewMode={mapViewMode}
                                    userLocation={userLocation}
                                />
                            </div>
                        </Suspense>
                    )}

                    <button
                        type="button"
                        onClick={() => setMapViewMode((previousViewMode) => (previousViewMode === "globe" ? "map" : "globe"))}
                        className="inline-flex h-[3rem] w-[3rem] items-center justify-center rounded-full border border-[#50300d] bg-[#f6dfc1] text-[1.35rem] text-[#50300d] shadow-[0_3px_10px_#50300d2e] transition hover:bg-[#eab681]"
                        aria-label="Switch between globe and flat map view"
                    >
                        {mapViewMode === "globe" ? (
                            <svg viewBox="0 0 24 24" className="h-[1.35rem] w-[1.35rem]" fill="none" aria-hidden="true">
                                <path d="M3 6.5L9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                                <path d="M9 4v13.5M15 6.5V20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" className="h-[1.35rem] w-[1.35rem]" fill="none" aria-hidden="true">
                                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                                <path d="M3 12h18M12 3c2.6 2.4 4 5.5 4 9s-1.4 6.6-4 9c-2.6-2.4-4-5.5-4-9s1.4-6.6 4-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                    </button>
                </div>

                <aside className="rounded-[2rem] border border-[#7a3f00]/15 bg-[#5c3722eb] p-5 text-[#ffead4] shadow-[0_24px_60px_#5a392b38]">
                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.24em] text-[#f6d7b5]">Map status</p>
                    <h2 className="mt-2 font-[Adamina] text-[1.8rem] text-[#fff4e7]">Legend synced with your globe</h2>
                    <p className="mt-2 font-[Cormorant_Garamond] text-[1.18rem] text-[#f7dfca]">
                        Every count below maps directly to your country states, with no duplicated summary cards.
                    </p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <article className="rounded-[1.2rem] border border-[#eab681]/25 bg-[#ffead414] p-4 shadow-[inset_0_1px_0_#ffffff2b]">
                            <p className="font-[Adamina] text-[0.72rem] uppercase tracking-[0.2em] text-[#f6d7b5]">Visited</p>
                            <p className="mt-2 font-[Adamina] text-3xl text-[#fff4e7]">{statusCounts.visited}</p>
                            <p className="mt-1 font-[Cormorant_Garamond] text-[1.05rem] text-[#f7dfca]">Countries marked as explored.</p>
                        </article>

                        <article className="rounded-[1.2rem] border border-[#eab681]/25 bg-[#ffead414] p-4 shadow-[inset_0_1px_0_#ffffff2b]">
                            <p className="font-[Adamina] text-[0.72rem] uppercase tracking-[0.2em] text-[#f6d7b5]">Wishlist</p>
                            <p className="mt-2 font-[Adamina] text-3xl text-[#fff4e7]">{statusCounts.wantToGo}</p>
                            <p className="mt-1 font-[Cormorant_Garamond] text-[1.05rem] text-[#f7dfca]">Planned destinations.</p>
                        </article>

                        <article className="rounded-[1.2rem] border border-[#eab681]/25 bg-[#ffead414] p-4 shadow-[inset_0_1px_0_#ffffff2b]">
                            <p className="font-[Adamina] text-[0.72rem] uppercase tracking-[0.2em] text-[#f6d7b5]">Want to re-visit</p>
                            <p className="mt-2 font-[Adamina] text-3xl text-[#fff4e7]">{statusCounts.wantToVisitAgain}</p>
                            <p className="mt-1 font-[Cormorant_Garamond] text-[1.05rem] text-[#f7dfca]">Places worth another chapter.</p>
                        </article>

                        <article className="rounded-[1.2rem] border border-[#eab681]/25 bg-[#ffead414] p-4 shadow-[inset_0_1px_0_#ffffff2b]">
                            <p className="font-[Adamina] text-[0.72rem] uppercase tracking-[0.2em] text-[#f6d7b5]">Nothing</p>
                            <p className="mt-2 font-[Adamina] text-3xl text-[#fff4e7]">{statusCounts.notInterested}</p>
                            <p className="mt-1 font-[Cormorant_Garamond] text-[1.05rem] text-[#f7dfca]">Countries not marked yet.</p>
                        </article>
                    </div>

                    <div className="mt-5 rounded-[1.4rem] border border-[#7a3f00]/15 bg-[#5a392b] px-4 py-4 text-[#ffead4]">
                        <p className="font-[Adamina] text-[0.8rem] uppercase tracking-[0.2em] text-[#f6d7b5]">Current focus</p>
                        <p className="mt-2 font-[Cormorant_Garamond] text-[1.2rem] leading-[1.15] text-[#fff4e7]">
                            {statusCounts.wantToGo > statusCounts.visited
                                ? "Your wishlist is growing faster than your stamped countries, which is a lovely problem to have."
                                : "Your map is already filling out nicely, and the visited layer now carries the page visually."}
                        </p>
                    </div>
                </aside>
            </section>
        </div>
    );
}

export default Home;
