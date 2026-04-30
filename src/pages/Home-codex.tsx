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
    const [mapStatusFilters, setMapStatusFilters] = useState<Set<CountryStatus | "not-explored">>(
        new Set(["visited", "want-to-visit-again"])
    );
    const [listStatusFilters, setListStatusFilters] = useState<Set<CountryStatus | "not-explored">>(
        new Set(["visited", "want-to-go", "want-to-visit-again", "not-explored"])
    );
    const [listSort, setListSort] = useState<"a-z" | "z-a" | "status">("a-z");
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
            const status = countryStatuses[countryName] ?? "not-explored";
            return mapStatusFilters.has(status);
        });
    }, [countryNames, countryStatuses, mapStatusFilters]);

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

    const toggleMapStatusFilter = (status: CountryStatus | "not-explored") => {
        const newFilters = new Set(mapStatusFilters);
        if (newFilters.has(status)) {
            newFilters.delete(status);
        } else {
            newFilters.add(status);
        }
        setMapStatusFilters(newFilters);
    };

    const getStatusColor = (status: CountryStatus | "not-explored" | null): string => {
        if (status === "visited") return "bg-[#CF8D45] text-[#ffead4] border-[#CF8D45]";
        if (status === "want-to-visit-again") return "bg-[#FABE7D] text-[#50300d] border-[#FABE7D]";
        if (status === "want-to-go") return "bg-[#7A3F00] text-[#ffead4] border-[#7A3F00]";
        return "bg-[#7a3f00]/20 text-[#6a4630] border-[#7a3f00]/40";
    };

    const toggleListStatusFilter = (status: CountryStatus | "not-explored") => {
        const newFilters = new Set(listStatusFilters);
        if (newFilters.has(status)) {
            newFilters.delete(status);
        } else {
            newFilters.add(status);
        }
        setListStatusFilters(newFilters);
    };

    const filteredAndSortedCountries = useMemo(() => {
        let filtered = countryNames.filter((countryName) => {
            const status = countryStatuses[countryName] ?? "not-explored";
            return listStatusFilters.has(status);
        });

        if (listSort === "z-a") {
            return filtered.sort((a, b) => b.localeCompare(a));
        }

        if (listSort === "status") {
            const statusOrder = { "visited": 0, "want-to-visit-again": 1, "want-to-go": 2, "not-explored": 3 };
            return filtered.sort((a, b) => {
                const statusA = countryStatuses[a] ?? "not-explored";
                const statusB = countryStatuses[b] ?? "not-explored";
                const orderDiff = (statusOrder[statusA] ?? 3) - (statusOrder[statusB] ?? 3);
                return orderDiff !== 0 ? orderDiff : a.localeCompare(b);
            });
        }

        return filtered.sort((a, b) => a.localeCompare(b));
    }, [countryNames, countryStatuses, listStatusFilters, listSort]);

    return (
        <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-8 px-4 pb-14 pt-6 sm:px-6 lg:px-8">
            <aside className="rounded-[1.8rem] border border-[#7a3f00]/15 bg-[#5c3722eb] p-5 text-[#ffead4] shadow-[0_20px_40px_#5a392b38]">
                <div className="flex h-full flex-col gap-5">
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
                                className="mt-4 flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1"
                                role="group"
                                aria-label="Countries to show on map"
                            >
                                {filteredCountryNames.length === 0 ? (
                                    <p className="m-0 font-[Cormorant_Garamond] text-[1.1rem] text-[#f7dfca]">No countries found.</p>
                                ) : (
                                    filteredCountryNames.map((countryName) => {
                                        const status = countryStatuses[countryName] ?? null;

                                        return (
                                            <div
                                                key={countryName}
                                                className="flex items-center gap-2"
                                            >
                                                <span className="flex-shrink-0 font-[Cormorant_Garamond] text-[0.95rem] text-[#f7dfca] min-w-max">
                                                    {countryName}
                                                </span>
                                                <select
                                                    value={status ?? "null"}
                                                    onChange={(e) => {
                                                        const newStatus = e.target.value === "null" ? null : (e.target.value as CountryStatus);
                                                        setCountryStatus(countryName, newStatus);
                                                    }}
                                                    className="rounded-[0.6rem] border border-[#7a3f00]/40 bg-[#5a392b]/60 px-2 py-1 font-[Cormorant_Garamond] text-[0.85rem] text-[#fff4e7] outline-none transition hover:border-[#7a3f00]/60 focus:border-[#cf8d45] focus:ring-2 focus:ring-[#cf8d45]/40"
                                                    aria-label={`Status for ${countryName}`}
                                                >
                                                    <option value="null">Not explored</option>
                                                    <option value="want-to-go">To be visited</option>
                                                    <option value="visited">Visited</option>
                                                    <option value="want-to-visit-again">Want to return</option>
                                                </select>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </aside>

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
                                    countryStatuses={countryStatuses}
                                    mapStatusFilters={mapStatusFilters}
                                />
                            </div>
                        </Suspense>
                    )}

                    <div className="flex flex-col items-center gap-4">
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

                        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Filter map by country status">
                            <button
                                type="button"
                                onClick={() => toggleMapStatusFilter("visited")}
                                className={`px-4 py-2 rounded-full text-sm font-[Cormorant_Garamond] transition ${
                                    mapStatusFilters.has("visited")
                                        ? "bg-[#CF8D45] text-[#ffead4] border border-[#CF8D45]"
                                        : "bg-[#CF8D45]/20 text-[#6a4630] border border-[#CF8D45]/40 hover:bg-[#CF8D45]/30"
                                }`}
                            >
                                Visited
                            </button>
                            <button
                                type="button"
                                onClick={() => toggleMapStatusFilter("want-to-go")}
                                className={`px-4 py-2 rounded-full text-sm font-[Cormorant_Garamond] transition ${
                                    mapStatusFilters.has("want-to-go")
                                        ? "bg-[#7A3F00] text-[#ffead4] border border-[#7A3F00]"
                                        : "bg-[#7A3F00]/20 text-[#6a4630] border border-[#7A3F00]/40 hover:bg-[#7A3F00]/30"
                                }`}
                            >
                                To be visited
                            </button>
                            <button
                                type="button"
                                onClick={() => toggleMapStatusFilter("want-to-visit-again")}
                                className={`px-4 py-2 rounded-full text-sm font-[Cormorant_Garamond] transition ${
                                    mapStatusFilters.has("want-to-visit-again")
                                        ? "bg-[#FABE7D] text-[#50300d] border border-[#FABE7D]"
                                        : "bg-[#FABE7D]/20 text-[#6a4630] border border-[#FABE7D]/40 hover:bg-[#FABE7D]/30"
                                }`}
                            >
                                Want to return
                            </button>
                            <button
                                type="button"
                                onClick={() => toggleMapStatusFilter("not-explored")}
                                className={`px-4 py-2 rounded-full text-sm font-[Cormorant_Garamond] transition ${
                                    mapStatusFilters.has("not-explored")
                                        ? "bg-[#7a3f00] text-[#ffead4] border border-[#7a3f00]"
                                        : "bg-[#7a3f00]/20 text-[#6a4630] border border-[#7a3f00]/40 hover:bg-[#7a3f00]/30"
                                }`}
                            >
                                Not explored
                            </button>
                        </div>
                    </div>
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

            <section className="rounded-[2rem] border border-[#7a3f00]/15 bg-[#5c3722eb] p-6 text-[#ffead4]">
                <h2 className="font-[Adamina] text-[1.8rem] text-[#fff4e7]">All Countries</h2>
                <p className="mt-1 font-[Cormorant_Garamond] text-[1.1rem] text-[#f7dfca]">Mark your travel status for each destination</p>

                {isLoading || !countriesData ? (
                    <div className="mt-6 text-center font-[Cormorant_Garamond] text-[1.1rem] text-[#f7dfca]">Loading countries...</div>
                ) : (
                    <>
                        <div className="mt-6 space-y-4">
                            <div>
                                <p className="mb-3 font-[Adamina] text-[0.78rem] uppercase tracking-[0.24em] text-[#f6d7b5]">Filter by status</p>
                                <div className="flex flex-wrap gap-2" role="group" aria-label="Filter countries by status">
                                    <button
                                        type="button"
                                        onClick={() => toggleListStatusFilter("visited")}
                                        className={`px-4 py-2 rounded-full text-sm font-[Cormorant_Garamond] transition ${listStatusFilters.has("visited") ? "bg-[#CF8D45] text-[#ffead4] border border-[#CF8D45]" : "bg-[#CF8D45]/20 text-[#6a4630] border border-[#CF8D45]/40 hover:bg-[#CF8D45]/30"}`}
                                    >
                                        Visited
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toggleListStatusFilter("want-to-go")}
                                        className={`px-4 py-2 rounded-full text-sm font-[Cormorant_Garamond] transition ${listStatusFilters.has("want-to-go") ? "bg-[#7A3F00] text-[#ffead4] border border-[#7A3F00]" : "bg-[#7A3F00]/20 text-[#6a4630] border border-[#7A3F00]/40 hover:bg-[#7A3F00]/30"}`}
                                    >
                                        To be visited
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toggleListStatusFilter("want-to-visit-again")}
                                        className={`px-4 py-2 rounded-full text-sm font-[Cormorant_Garamond] transition ${listStatusFilters.has("want-to-visit-again") ? "bg-[#FABE7D] text-[#50300d] border border-[#FABE7D]" : "bg-[#FABE7D]/20 text-[#6a4630] border border-[#FABE7D]/40 hover:bg-[#FABE7D]/30"}`}
                                    >
                                        Want to return
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toggleListStatusFilter("not-explored")}
                                        className={`px-4 py-2 rounded-full text-sm font-[Cormorant_Garamond] transition ${listStatusFilters.has("not-explored") ? "bg-[#7a3f00] text-[#ffead4] border border-[#7a3f00]" : "bg-[#7a3f00]/20 text-[#6a4630] border border-[#7a3f00]/40 hover:bg-[#7a3f00]/30"}`}
                                    >
                                        Not explored
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block">
                                    <span className="mb-3 block font-[Adamina] text-[0.78rem] uppercase tracking-[0.24em] text-[#f6d7b5]">Sort by</span>
                                    <select
                                        value={listSort}
                                        onChange={(e) => setListSort(e.target.value as "a-z" | "z-a" | "status")}
                                        className="rounded-[0.8rem] border border-[#eab681]/50 bg-[#5a392b] px-4 py-2 font-[Cormorant_Garamond] text-[1rem] text-[#f7dfca] outline-none transition focus:border-[#f6d7b5] focus:ring-2 focus:ring-[#eab681]/40"
                                        aria-label="Sort countries"
                                    >
                                        <option value="a-z">A to Z</option>
                                        <option value="z-a">Z to A</option>
                                        <option value="status">By status</option>
                                    </select>
                                </label>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                            {filteredAndSortedCountries.map((countryName) => {
                                const status = countryStatuses[countryName] ?? null;
                                return (
                                    <div
                                        key={countryName}
                                        className={`rounded-[1.2rem] border p-4 transition ${getStatusColor(status)}`}
                                    >
                                        <div className="flex flex-col gap-3">
                                            <span className="font-[Cormorant_Garamond] text-[1rem] text-[#fff4e7] line-clamp-2">
                                                {countryName}
                                            </span>
                                            <select
                                                value={status ?? "null"}
                                                onChange={(e) => {
                                                    const newStatus = e.target.value === "null" ? null : (e.target.value as CountryStatus);
                                                    setCountryStatus(countryName, newStatus);
                                                }}
                                                className="w-full rounded-[0.8rem] border border-[#7a3f00]/40 bg-[#5a392b]/60 px-3 py-2 font-[Cormorant_Garamond] text-[0.9rem] text-[#fff4e7] outline-none transition hover:border-[#7a3f00]/60 focus:border-[#cf8d45] focus:ring-2 focus:ring-[#cf8d45]/40"
                                                aria-label={`Status for ${countryName}`}
                                            >
                                                <option value="null">Not explored</option>
                                                <option value="want-to-go">To be visited</option>
                                                <option value="visited">Visited</option>
                                                <option value="want-to-visit-again">Want to return</option>
                                            </select>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}

export default Home;
