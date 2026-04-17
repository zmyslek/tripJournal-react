import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useCountriesData } from "../hooks/useCountriesData";
import { getCountryName } from "../types/countries";
import { type CountriesGeoJson, type CountryFeature } from "../types/countries";

const Map = lazy(() => import("../components/Map.tsx"));

type CountryStatus = "want-to-go" | "visited" | "want-to-visit-again";
type CountryStatusMap = Record<string, CountryStatus>;

type HomeProps = {
    selectedCountries: string[];
    countryStatuses: CountryStatusMap;
    setCountryStatus: (countryName: string, status: CountryStatus | null) => void;
};

type StatusOption = {
    value: CountryStatus | null;
    label: string;
    icon: string;
};

const STATUS_OPTIONS: StatusOption[] = [
    { value: null, label: "Not interested", icon: "-" },
    { value: "want-to-go", label: "Want to go", icon: "W" },
    { value: "visited", label: "Visited", icon: "V" },
    { value: "want-to-visit-again", label: "Visit again", icon: "R" }
];

const STATUS_RANK: Record<CountryStatus | "none", number> = {
    "want-to-go": 0,
    "visited": 1,
    "want-to-visit-again": 2,
    none: 3
};

const STATUS_STYLE: Record<CountryStatus | "none", string> = {
    "want-to-go": "border-[#eab681] bg-[#fff6ea] text-[#6d3f1f]",
    "visited": "border-[#7a3f00] bg-[#f3debf] text-[#50300d]",
    "want-to-visit-again": "border-[#cf8d45] bg-[#f9e7d1] text-[#6e4428]",
    none: "border-[#d6b48d] bg-[#fffdf9] text-[#7a5d44]"
};

const pointInRing = (lng: number, lat: number, ring: number[][]) => {
    let inside = false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i]?.[0] ?? 0;
        const yi = ring[i]?.[1] ?? 0;
        const xj = ring[j]?.[0] ?? 0;
        const yj = ring[j]?.[1] ?? 0;

        const intersects = yi > lat !== yj > lat
            && lng < ((xj - xi) * (lat - yi)) / ((yj - yi) || Number.EPSILON) + xi;

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

    for (let i = 1; i < polygon.length; i += 1) {
        if (pointInRing(lng, lat, polygon[i] ?? [])) {
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

function Home({ selectedCountries, countryStatuses, setCountryStatus }: HomeProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [mapViewMode, setMapViewMode] = useState<"globe" | "map">("globe");
    const [userLocation, setUserLocation] = useState<{ lng: number; lat: number } | null>(null);
    const [suggestionStatus, setSuggestionStatus] = useState<CountryStatus>("want-to-go");
    const autoSelectedLocationKeyRef = useRef<string | null>(null);
    const hasRequestedGeolocationRef = useRef(false);
    const listAnchorRefs = useRef<Record<string, HTMLDivElement | null>>({});
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
                // Continue without geolocation.
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
        if (!countryName) {
            return;
        }

        const currentStatus = countryStatuses[countryName] ?? null;
        if (currentStatus !== "visited") {
            setCountryStatus(countryName, "visited");
        }
    }, [countriesData, countryStatuses, setCountryStatus, userLocation]);

    const countryNames = useMemo(() => {
        if (!countriesData) {
            return [];
        }

        const names = countriesData.features
            .map(getCountryName)
            .filter((name) => name.length > 0);

        return [...new Set(names)].sort((a, b) => a.localeCompare(b));
    }, [countriesData]);

    const sortedCountryNames = useMemo(() => {
        return [...countryNames].sort((leftCountry, rightCountry) => {
            const leftStatus = countryStatuses[leftCountry] ?? "none";
            const rightStatus = countryStatuses[rightCountry] ?? "none";

            if (STATUS_RANK[leftStatus] !== STATUS_RANK[rightStatus]) {
                return STATUS_RANK[leftStatus] - STATUS_RANK[rightStatus];
            }

            return leftCountry.localeCompare(rightCountry);
        });
    }, [countryNames, countryStatuses]);

    const searchSuggestions = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) {
            return [];
        }

        return countryNames
            .filter((countryName) => countryName.toLowerCase().includes(query))
            .slice(0, 8);
    }, [countryNames, searchTerm]);

    const visitedCount = useMemo(() => {
        return Object.values(countryStatuses).filter((status) => status === "visited" || status === "want-to-visit-again").length;
    }, [countryStatuses]);

    const totalCount = countryNames.length;
    const coverage = totalCount > 0 ? (visitedCount / totalCount) * 100 : 0;

    const statusCounts = useMemo(() => {
        return {
            wantToGo: Object.values(countryStatuses).filter((status) => status === "want-to-go").length,
            visited: Object.values(countryStatuses).filter((status) => status === "visited").length,
            revisit: Object.values(countryStatuses).filter((status) => status === "want-to-visit-again").length
        };
    }, [countryStatuses]);

    const jumpToCountryCard = (countryName: string) => {
        const anchor = listAnchorRefs.current[countryName];
        if (anchor) {
            anchor.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    };

    return (
        <div className="mx-auto w-[min(96vw,1420px)] px-3 pb-6 pt-2 sm:px-4">
            <section className="mb-4 rounded-[1.1rem] border border-[#eab681]/70 bg-[linear-gradient(130deg,rgba(255,242,225,0.96),rgba(247,226,197,0.95))] p-4 shadow-[0_8px_22px_rgba(90,57,43,0.12)]">
                <div className="grid gap-4 lg:grid-cols-[1.35fr,1fr] lg:items-center">
                    <div>
                        <p className="font-[Adamina] text-[0.84rem] uppercase tracking-[0.2em] text-[#7a3f00]">Personal atlas</p>
                        <h1 className="mt-1 font-[Adamina] text-[1.45rem] leading-[1.1] text-[#50300d] sm:text-[1.7rem]">Trip setup and country tracker</h1>
                        <p className="mt-1.5 font-[Cormorant_Garamond] text-[1.2rem] leading-[1.1] text-[#5c3a24]">
                            Mark countries by status and keep your globe as the center of your travel story.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                        <article className="rounded-[0.9rem] border border-[#cf8d45]/45 bg-[#fff8ee]/95 px-3 py-2.5">
                            <p className="font-[Adamina] text-[0.74rem] uppercase tracking-[0.16em] text-[#6d4428]">Countries coverage</p>
                            <p className="mt-1 font-[Adamina] text-[1.55rem] text-[#50300d]">{coverage.toFixed(1)}%</p>
                        </article>
                        <article className="rounded-[0.9rem] border border-[#cf8d45]/45 bg-[#fff8ee]/95 px-3 py-2.5">
                            <p className="font-[Adamina] text-[0.74rem] uppercase tracking-[0.16em] text-[#6d4428]">Visited total</p>
                            <p className="mt-1 font-[Adamina] text-[1.55rem] text-[#50300d]">{visitedCount}</p>
                        </article>
                        <article className="rounded-[0.9rem] border border-[#cf8d45]/45 bg-[#fff8ee]/95 px-3 py-2.5">
                            <p className="font-[Adamina] text-[0.74rem] uppercase tracking-[0.16em] text-[#6d4428]">Want to go</p>
                            <p className="mt-1 font-[Adamina] text-[1.28rem] text-[#7a3f00]">{statusCounts.wantToGo}</p>
                        </article>
                        <article className="rounded-[0.9rem] border border-[#cf8d45]/45 bg-[#fff8ee]/95 px-3 py-2.5">
                            <p className="font-[Adamina] text-[0.74rem] uppercase tracking-[0.16em] text-[#6d4428]">Visit again</p>
                            <p className="mt-1 font-[Adamina] text-[1.28rem] text-[#7a3f00]">{statusCounts.revisit}</p>
                        </article>
                    </div>
                </div>
            </section>

            <section className="mb-4 rounded-[1.2rem] border border-[#eab681]/80 bg-[linear-gradient(180deg,rgba(255,244,228,0.84),rgba(251,235,213,0.65))] p-2 shadow-[0_12px_26px_rgba(90,57,43,0.14)] sm:p-3" aria-label="Map area">
                {isLoading || !countriesData ? (
                    <div className="flex h-[min(82vw,82vh)] w-full items-center justify-center rounded-[1rem] border border-[#eab681] bg-[#fff7ea]/70 text-center font-[Cormorant_Garamond] text-[1.2rem] text-[#50300d]">
                        Loading map data...
                    </div>
                ) : (
                    <Suspense
                        fallback={
                            <div className="flex h-[min(82vw,82vh)] w-full items-center justify-center rounded-[1rem] border border-[#eab681] bg-[#fff7ea]/70 text-center font-[Cormorant_Garamond] text-[1.2rem] text-[#50300d]">
                                Loading map...
                            </div>
                        }
                    >
                        <Map
                            countriesData={countriesData}
                            selectedCountries={selectedCountries}
                            viewMode={mapViewMode}
                            userLocation={userLocation}
                        />
                    </Suspense>
                )}
                <div className="mt-2.5 flex justify-center">
                    <button
                        type="button"
                        onClick={() => setMapViewMode((prev) => (prev === "globe" ? "map" : "globe"))}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#7a3f00]/35 bg-[#fff3e3] px-4 py-2 font-[Adamina] text-[0.78rem] uppercase tracking-[0.14em] text-[#5a392b] shadow-[0_6px_16px_rgba(90,57,43,0.14)] transition hover:bg-[#fbe2c2]"
                        aria-label="Switch between globe and flat map view"
                    >
                        {mapViewMode === "globe" ? "Switch to flat map" : "Switch to globe"}
                    </button>
                </div>
            </section>

            <section className="mb-4 rounded-[1rem] border border-[#eab681]/70 bg-[#fff7ea]/90 p-3 shadow-[0_8px_20px_rgba(90,57,43,0.11)]" aria-label="Country search">
                <div className="grid gap-2 sm:grid-cols-[1fr,auto] sm:items-center">
                    <label className="relative block" htmlFor="country-search">
                        <span className="sr-only">Search countries</span>
                        <input
                            id="country-search"
                            type="search"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search countries and jump to card"
                            className="w-full rounded-[0.8rem] border border-[#cf8d45]/70 bg-white px-3 py-2.5 font-[Cormorant_Garamond] text-[1.12rem] text-[#50300d] outline-none transition focus:border-[#7a3f00] focus:ring-2 focus:ring-[#eab681]/60"
                        />
                    </label>
                    <select
                        value={suggestionStatus}
                        onChange={(event) => setSuggestionStatus(event.target.value as CountryStatus)}
                        className="min-h-[44px] rounded-[0.8rem] border border-[#cf8d45]/70 bg-white px-3 py-2 font-[Adamina] text-[0.8rem] uppercase tracking-[0.12em] text-[#5a392b] outline-none focus:border-[#7a3f00]"
                        aria-label="Status applied from suggestions"
                    >
                        <option value="want-to-go">Set to want to go</option>
                        <option value="visited">Set to visited</option>
                        <option value="want-to-visit-again">Set to visit again</option>
                    </select>
                </div>

                {searchTerm.trim().length > 0 && (
                    <div className="mt-2 max-h-[260px] overflow-y-auto rounded-[0.8rem] border border-[#eab681]/65 bg-white/95 p-2">
                        {searchSuggestions.length === 0 ? (
                            <p className="m-0 px-2 py-1 font-[Cormorant_Garamond] text-[1.1rem] text-[#7a5d44]">No country matches.</p>
                        ) : (
                            <ul className="m-0 list-none space-y-1 p-0">
                                {searchSuggestions.map((countryName) => {
                                    const currentStatus = countryStatuses[countryName] ?? null;
                                    const currentStatusLabel = STATUS_OPTIONS.find((option) => option.value === currentStatus)?.label ?? "Not interested";

                                    return (
                                        <li key={`suggestion-${countryName}`}>
                                            <button
                                                type="button"
                                                className="flex w-full items-center justify-between rounded-[0.65rem] border border-transparent px-2.5 py-2 text-left transition hover:border-[#eab681] hover:bg-[#fff5e9]"
                                                onClick={() => {
                                                    setCountryStatus(countryName, suggestionStatus);
                                                    jumpToCountryCard(countryName);
                                                    setSearchTerm("");
                                                }}
                                            >
                                                <span className="font-[Cormorant_Garamond] text-[1.16rem] text-[#50300d]">{countryName}</span>
                                                <span className="font-[Adamina] text-[0.68rem] uppercase tracking-[0.12em] text-[#7a5d44]">Now: {currentStatusLabel}</span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                )}

                {error && (
                    <p className="mt-2 rounded-[0.75rem] border border-[#cf8d45]/60 bg-[#f6dfc1] px-3 py-2 font-[Cormorant_Garamond] text-[1.1rem] text-[#50300d]">
                        {error}
                    </p>
                )}
            </section>

            <section
                className="grid grid-cols-1 gap-2.5 rounded-[1rem] border border-[#eab681]/75 bg-[linear-gradient(180deg,rgba(255,248,236,0.92),rgba(249,231,205,0.86))] p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                aria-label="Country status list"
            >
                {sortedCountryNames.map((countryName) => {
                    const currentStatus = countryStatuses[countryName] ?? null;
                    const statusKey = currentStatus ?? "none";

                    return (
                        <div
                            key={countryName}
                            ref={(node) => {
                                listAnchorRefs.current[countryName] = node;
                            }}
                            className={`rounded-[0.92rem] border p-2.5 shadow-[0_3px_10px_rgba(90,57,43,0.08)] ${STATUS_STYLE[statusKey]}`}
                        >
                            <p className="mb-2 line-clamp-1 font-[Cormorant_Garamond] text-[1.18rem] leading-[1.05]">{countryName}</p>
                            <div className="grid grid-cols-4 gap-1.5" role="group" aria-label={`Status for ${countryName}`}>
                                {STATUS_OPTIONS.map((option) => {
                                    const isActive = currentStatus === option.value;
                                    return (
                                        <button
                                            key={`${countryName}-${option.label}`}
                                            type="button"
                                            onClick={() => setCountryStatus(countryName, option.value)}
                                            className={`inline-flex min-h-[38px] items-center justify-center rounded-[0.62rem] border font-[Adamina] text-[0.68rem] uppercase tracking-[0.09em] transition ${isActive
                                                ? "border-[#7a3f00] bg-[#7a3f00] text-[#ffead4] shadow-[0_4px_10px_rgba(90,57,43,0.2)]"
                                                : "border-[#cf8d45]/70 bg-white/80 text-[#6b4124] hover:bg-[#fff0dd]"}`}
                                            title={option.label}
                                            aria-label={`${countryName}: ${option.label}`}
                                            aria-pressed={isActive}
                                        >
                                            {option.icon}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </section>
        </div>
    );
}

export default Home;
