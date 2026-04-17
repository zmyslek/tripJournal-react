import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
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

interface StatusButtonDefinition {
    label: string;
    shortLabel: string;
    value: CountryStatus | null;
    icon: ReactNode;
    accentClassName: string;
    chipClassName: string;
}

interface StatCardDefinition {
    label: string;
    value: number;
    description: string;
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

const statusButtons: StatusButtonDefinition[] = [
    {
        label: "Not interested",
        shortLabel: "Pass",
        value: null,
        accentClassName: "border-[#cf8d45]/60 bg-white/55 text-[#6d4322] hover:bg-[#fff1df]",
        chipClassName: "border-[#cf8d45]/50 bg-white/70 text-[#6d4322]",
        icon: (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                <path d="M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
        )
    },
    {
        label: "Want to go",
        shortLabel: "Wishlist",
        value: "want-to-go",
        accentClassName: "border-[#cf8d45]/60 bg-[#fff3e2] text-[#7a3f00] hover:bg-[#ffe3bf]",
        chipClassName: "border-[#cf8d45]/60 bg-[#fff4e3] text-[#7a3f00]",
        icon: (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                <path d="M4 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        )
    },
    {
        label: "Visited",
        shortLabel: "Visited",
        value: "visited",
        accentClassName: "border-[#7a3f00]/40 bg-[#f7d6a4] text-[#5a392b] hover:bg-[#f1c47d]",
        chipClassName: "border-[#7a3f00]/40 bg-[#f6d39a] text-[#5a392b]",
        icon: (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                <path d="M20 7L9 18l-5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        )
    },
    {
        label: "Want to visit again",
        shortLabel: "Return",
        value: "want-to-visit-again",
        accentClassName: "border-[#5a392b]/50 bg-[#e7c6b4] text-[#5a392b] hover:bg-[#dab09a]",
        chipClassName: "border-[#5a392b]/50 bg-[#ead1c5] text-[#5a392b]",
        icon: (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                <path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M20 5v5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        )
    }
];

const getStatusDefinition = (status: CountryStatus | null) => {
    return statusButtons.find((button) => button.value === status) ?? statusButtons[0];
};

const formatCoverage = (visitedCount: number, totalCount: number) => {
    if (totalCount === 0) {
        return "0%";
    }

    return `${Math.round((visitedCount / totalCount) * 100)}%`;
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

    const sortedCountryNames = useMemo(() => {
        const statusRank = (countryName: string) => {
            const status = countryStatuses[countryName] ?? null;

            if (status === null) {
                return 0;
            }

            if (status === "want-to-go") {
                return 1;
            }

            if (status === "visited") {
                return 2;
            }

            return 3;
        };

        return [...countryNames].sort((leftCountry, rightCountry) => {
            const rankDifference = statusRank(leftCountry) - statusRank(rightCountry);
            if (rankDifference !== 0) {
                return rankDifference;
            }

            return leftCountry.localeCompare(rightCountry);
        });
    }, [countryNames, countryStatuses]);

    const normalizedQuery = searchTerm.trim().toLowerCase();

    const matchingCountryNames = useMemo(() => {
        if (!normalizedQuery) {
            return sortedCountryNames;
        }

        return sortedCountryNames.filter((countryName) => countryName.toLowerCase().includes(normalizedQuery));
    }, [normalizedQuery, sortedCountryNames]);

    const matchingCountryNameSet = useMemo(() => new Set(matchingCountryNames), [matchingCountryNames]);

    const highlightedCountries = useMemo(() => {
        return countryNames.filter((countryName) => {
            const status = countryStatuses[countryName];
            return status === "visited" || status === "want-to-visit-again";
        });
    }, [countryNames, countryStatuses]);

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

    const statCards: StatCardDefinition[] = [
        {
            label: "Visited",
            value: statusCounts.visited,
            description: "Places you've already stitched into your travel record."
        },
        {
            label: "Wishlist",
            value: statusCounts.wantToGo,
            description: "Countries waiting for their turn on the itinerary."
        },
        {
            label: "Return trips",
            value: statusCounts.wantToVisitAgain,
            description: "Destinations that deserve another chapter."
        },
        {
            label: "Coverage",
            value: Number.parseInt(formatCoverage(highlightedCountries.length, countryNames.length), 10),
            description: "Percentage of the world you've marked as explored."
        }
    ];

    const searchSummary = normalizedQuery
        ? `${matchingCountryNames.length} country${matchingCountryNames.length === 1 ? "" : "ies"} found`
        : `${countryNames.length} countries ready to sort`;

    return (
        <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-8 px-4 pb-14 pt-6 sm:px-6 lg:px-8">
            <section className="overflow-hidden rounded-[2rem] border border-[#cf8d45]/45 bg-[linear-gradient(135deg,rgba(255,244,229,0.95),rgba(244,222,190,0.88))] shadow-[0_24px_60px_rgba(90,57,43,0.16)]">
                <div className="grid gap-10 px-6 py-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:px-10 lg:py-10">
                    <div className="relative">
                        <div className="absolute left-0 top-0 h-20 w-20 rounded-full bg-[#eab681]/30 blur-3xl" aria-hidden="true" />
                        <div className="absolute bottom-4 left-20 h-24 w-24 rounded-full bg-[#7a3f00]/10 blur-3xl" aria-hidden="true" />
                        <div className="relative space-y-5">
                            <p className="inline-flex items-center rounded-full border border-[#7a3f00]/20 bg-white/55 px-4 py-1.5 font-[Adamina] text-[0.78rem] uppercase tracking-[0.28em] text-[#7a3f00]">
                                Personal atlas
                            </p>
                            <div className="space-y-4">
                                <h1 className="max-w-3xl font-[Adamina] text-4xl leading-[1.05] text-[#50300d] sm:text-5xl">
                                    Track every place that already feels like part of your story.
                                </h1>
                                <p className="max-w-2xl font-[Cormorant_Garamond] text-[1.45rem] leading-[1.2] text-[#6a4630]">
                                    Curate a warm, tactile record of where you&apos;ve been, where you&apos;re dreaming of next, and the countries you&apos;d happily return to again.
                                </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-[1.4rem] border border-[#cf8d45]/35 bg-white/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.22em] text-[#8f5a20]">Visited</p>
                                    <p className="mt-2 font-[Adamina] text-3xl text-[#50300d]">{statusCounts.visited}</p>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.05rem] text-[#6a4630]">Countries already marked as explored.</p>
                                </div>
                                <div className="rounded-[1.4rem] border border-[#cf8d45]/35 bg-white/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.22em] text-[#8f5a20]">Wishlist</p>
                                    <p className="mt-2 font-[Adamina] text-3xl text-[#50300d]">{statusCounts.wantToGo}</p>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.05rem] text-[#6a4630]">Future destinations waiting on the list.</p>
                                </div>
                                <div className="rounded-[1.4rem] border border-[#cf8d45]/35 bg-white/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.22em] text-[#8f5a20]">World covered</p>
                                    <p className="mt-2 font-[Adamina] text-3xl text-[#50300d]">{formatCoverage(highlightedCountries.length, countryNames.length)}</p>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.05rem] text-[#6a4630]">Measured from visited and return-trip countries.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <aside className="rounded-[1.8rem] border border-[#7a3f00]/15 bg-[rgba(92,55,34,0.92)] p-5 text-[#ffead4] shadow-[0_20px_40px_rgba(90,57,43,0.22)]">
                        <div className="flex h-full flex-col gap-5">
                            <div>
                                <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.22em] text-[#f6d7b5]">Trip setup</p>
                                <h2 className="mt-3 font-[Adamina] text-[1.7rem] leading-tight text-[#fff4e7]">Sort countries quickly, then explore the map.</h2>
                                <p className="mt-3 font-[Cormorant_Garamond] text-[1.18rem] leading-[1.2] text-[#f7dfca]">
                                    Search the catalog, assign a status, and use the globe or flat map to review your travel footprint.
                                </p>
                            </div>

                            <label className="block">
                                <span className="mb-2 block font-[Adamina] text-[0.85rem] uppercase tracking-[0.18em] text-[#f6d7b5]">Search countries</span>
                                <div className="relative">
                                    <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8f5a20]" fill="none" aria-hidden="true">
                                        <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
                                        <path d="M16 16L21 21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                                    </svg>
                                    <input
                                        type="search"
                                        value={searchTerm}
                                        onChange={(event) => setSearchTerm(event.target.value)}
                                        placeholder="Try Portugal, Japan, Morocco..."
                                        className="w-full rounded-[1rem] border border-[#eab681]/55 bg-[#fff6ea] py-3 pl-11 pr-4 font-[Cormorant_Garamond] text-[1.18rem] text-[#50300d] outline-none transition placeholder:text-[#9f7758] focus:border-[#f6d39a] focus:ring-2 focus:ring-[#f6d39a]/60"
                                    />
                                </div>
                            </label>

                            <div className="grid gap-3 sm:grid-cols-2">
                                {statusButtons.map((button) => (
                                    <div key={button.label} className="rounded-[1rem] border border-white/10 bg-white/8 px-3 py-3 backdrop-blur-[1px]">
                                        <div className="flex items-center gap-2 text-[#fff4e7]">
                                            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${button.chipClassName}`}>
                                                {button.icon}
                                            </span>
                                            <span className="font-[Adamina] text-[0.95rem] leading-tight">{button.label}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-[1.2rem] border border-[#eab681]/20 bg-black/10 px-4 py-3">
                                <p className="font-[Adamina] text-[0.8rem] uppercase tracking-[0.2em] text-[#f6d7b5]">Search status</p>
                                <p className="mt-2 font-[Cormorant_Garamond] text-[1.18rem] text-[#fff4e7]">{searchSummary}</p>
                            </div>
                        </div>
                    </aside>
                </div>
            </section>

            {error && (
                <section className="rounded-[1.4rem] border border-[#cf8d45]/50 bg-[#f7dfca] px-5 py-4 shadow-[0_10px_24px_rgba(90,57,43,0.08)]" aria-label="Map error">
                    <p className="font-[Adamina] text-[1rem] text-[#50300d]">Map data issue</p>
                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.18rem] text-[#6a4630]">{error}</p>
                </section>
            )}

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
                <div className="overflow-hidden rounded-[2rem] border border-[#cf8d45]/45 bg-[linear-gradient(180deg,rgba(255,249,241,0.96),rgba(247,231,208,0.9))] p-4 shadow-[0_24px_60px_rgba(90,57,43,0.14)] sm:p-6">
                    <div className="flex flex-col gap-4 border-b border-[#cf8d45]/30 pb-5 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.24em] text-[#8f5a20]">Map view</p>
                            <h2 className="mt-2 font-[Adamina] text-[1.9rem] text-[#50300d]">Your atlas at a glance</h2>
                            <p className="mt-2 font-[Cormorant_Garamond] text-[1.2rem] text-[#6a4630]">
                                Visited and return-trip countries are highlighted directly on the map.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setMapViewMode((previousViewMode) => (previousViewMode === "globe" ? "map" : "globe"))}
                            className="inline-flex min-h-[48px] items-center justify-center gap-2 self-start rounded-full border border-[#7a3f00]/30 bg-[#5a392b] px-5 py-3 font-[Adamina] text-[0.95rem] uppercase tracking-[0.16em] text-[#ffead4] transition hover:-translate-y-px hover:bg-[#72452f] focus:outline-none focus:ring-2 focus:ring-[#eab681]/70"
                            aria-label="Switch between globe and flat map view"
                        >
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                                {mapViewMode === "globe" ? (
                                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                                        <path d="M3 6.5L9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                                        <path d="M9 4v13.5M15 6.5V20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                                        <path d="M3 12h18M12 3c2.6 2.4 4 5.5 4 9s-1.4 6.6-4 9c-2.6-2.4-4-5.5-4-9s1.4-6.6 4-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </span>
                            {mapViewMode === "globe" ? "Switch to flat map" : "Switch to globe"}
                        </button>
                    </div>

                    <div className="mt-6 flex min-h-[420px] items-center justify-center rounded-[1.7rem] border border-[#cf8d45]/25 bg-[radial-gradient(circle_at_top,rgba(255,246,234,0.95),rgba(237,214,184,0.82))] p-3 sm:p-5">
                        {isLoading || !countriesData ? (
                            <div className="flex min-h-[420px] w-full items-center justify-center rounded-[1.5rem] border border-dashed border-[#cf8d45]/45 bg-white/35 px-6 text-center font-[Cormorant_Garamond] text-[1.3rem] text-[#6a4630]">
                                Loading map data...
                            </div>
                        ) : (
                            <Suspense
                                fallback={
                                    <div className="flex min-h-[420px] w-full items-center justify-center rounded-[1.5rem] border border-dashed border-[#cf8d45]/45 bg-white/35 px-6 text-center font-[Cormorant_Garamond] text-[1.3rem] text-[#6a4630]">
                                        Loading map...
                                    </div>
                                }
                            >
                                <Map
                                    countriesData={countriesData}
                                    selectedCountries={highlightedCountries}
                                    viewMode={mapViewMode}
                                    userLocation={userLocation}
                                />
                            </Suspense>
                        )}
                    </div>
                </div>

                <aside className="rounded-[2rem] border border-[#cf8d45]/45 bg-[linear-gradient(180deg,rgba(255,247,238,0.95),rgba(244,226,202,0.92))] p-5 shadow-[0_24px_60px_rgba(90,57,43,0.12)]">
                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.24em] text-[#8f5a20]">Travel summary</p>
                    <h2 className="mt-2 font-[Adamina] text-[1.8rem] text-[#50300d]">Quick reading of your journal</h2>
                    <p className="mt-2 font-[Cormorant_Garamond] text-[1.18rem] text-[#6a4630]">
                        A compact overview of your current spread across the world map.
                    </p>

                    <div className="mt-5 grid gap-3">
                        {statCards.map((card) => (
                            <article key={card.label} className="rounded-[1.4rem] border border-[#cf8d45]/35 bg-white/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="font-[Adamina] text-[1.05rem] text-[#50300d]">{card.label}</h3>
                                        <p className="mt-1 font-[Cormorant_Garamond] text-[1.05rem] leading-[1.15] text-[#6a4630]">{card.description}</p>
                                    </div>
                                    <span className="rounded-full border border-[#7a3f00]/15 bg-[#f7dfca] px-3 py-1 font-[Adamina] text-[1.1rem] text-[#7a3f00]">
                                        {card.label === "Coverage" ? `${card.value}%` : card.value}
                                    </span>
                                </div>
                            </article>
                        ))}
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

            <section className="rounded-[2rem] border border-[#cf8d45]/45 bg-[linear-gradient(180deg,rgba(255,249,241,0.96),rgba(244,228,206,0.92))] p-5 shadow-[0_24px_60px_rgba(90,57,43,0.12)] sm:p-6">
                <div className="flex flex-col gap-4 border-b border-[#cf8d45]/30 pb-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.24em] text-[#8f5a20]">Country catalog</p>
                        <h2 className="mt-2 font-[Adamina] text-[1.9rem] text-[#50300d]">Sort the world one destination at a time</h2>
                        <p className="mt-2 font-[Cormorant_Garamond] text-[1.2rem] text-[#6a4630]">
                            Every card keeps the same four actions, so scanning and updating stays quick.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {statusButtons.map((button) => (
                            <div key={`legend-${button.label}`} className={`inline-flex min-h-[42px] items-center gap-2 rounded-full border px-3 py-2 ${button.chipClassName}`}>
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-current/15 bg-white/30">
                                    {button.icon}
                                </span>
                                <span className="font-[Adamina] text-[0.9rem]">{button.shortLabel}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-[Cormorant_Garamond] text-[1.2rem] text-[#6a4630]">{searchSummary}</p>
                    {normalizedQuery ? (
                        <button
                            type="button"
                            onClick={() => setSearchTerm("")}
                            className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#7a3f00]/20 bg-white/55 px-4 py-2 font-[Adamina] text-[0.88rem] uppercase tracking-[0.15em] text-[#7a3f00] transition hover:bg-[#fff1df] focus:outline-none focus:ring-2 focus:ring-[#eab681]/70"
                        >
                            Clear search
                        </button>
                    ) : null}
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {matchingCountryNames.map((countryName) => {
                        const currentStatus = countryStatuses[countryName] ?? null;
                        const statusDefinition = getStatusDefinition(currentStatus);
                        const isMatched = matchingCountryNameSet.has(countryName);

                        return (
                            <article
                                key={countryName}
                                className={`rounded-[1.5rem] border p-4 shadow-[0_12px_26px_rgba(90,57,43,0.08)] transition ${isMatched ? "border-[#cf8d45]/45 bg-white/72" : "border-[#cf8d45]/25 bg-white/55"}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <h3 className="font-[Adamina] text-[1.18rem] leading-tight text-[#50300d]">{countryName}</h3>
                                    <span className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 font-[Adamina] text-[0.82rem] uppercase tracking-[0.08em] ${statusDefinition.chipClassName}`}>
                                        {statusDefinition.shortLabel}
                                    </span>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-2">
                                    {statusButtons.map((button) => {
                                        const isActive = button.value === currentStatus;

                                        return (
                                            <button
                                                key={`${countryName}-${button.label}`}
                                                type="button"
                                                onClick={() => setCountryStatus(countryName, button.value)}
                                                className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[1rem] border px-3 py-2 font-[Adamina] text-[0.85rem] uppercase tracking-[0.08em] transition focus:outline-none focus:ring-2 focus:ring-[#eab681]/70 ${button.accentClassName} ${isActive ? "shadow-[inset_0_0_0_1px_rgba(90,57,43,0.35),0_8px_18px_rgba(90,57,43,0.12)]" : "shadow-none"}`}
                                                aria-label={`${button.label} for ${countryName}`}
                                            >
                                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-current/15 bg-white/35">
                                                    {button.icon}
                                                </span>
                                                {button.shortLabel}
                                            </button>
                                        );
                                    })}
                                </div>
                            </article>
                        );
                    })}
                </div>

                {!isLoading && matchingCountryNames.length === 0 ? (
                    <div className="mt-6 rounded-[1.4rem] border border-dashed border-[#cf8d45]/45 bg-white/45 px-5 py-8 text-center">
                        <p className="font-[Adamina] text-[1.2rem] text-[#50300d]">No countries match that search.</p>
                        <p className="mt-2 font-[Cormorant_Garamond] text-[1.15rem] text-[#6a4630]">Try a broader name or clear the search to browse the full catalog.</p>
                    </div>
                ) : null}
            </section>
        </div>
    );
}

export default Home;
