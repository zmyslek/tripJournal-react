import { useEffect, useMemo, useRef, useState } from "react";
import { getCountryName } from "../types/countries";
import { useCountriesData } from "../hooks/useCountriesData";
import { type CountriesGeoJson, type CountryFeature } from "../types/countries";
import Map from "../components/Map.tsx";

type HomeProps = {
    selectedCountries: string[];
    toggleCountry: (countryName: string) => void;
};

const LOCATION_PROMPT_COOKIE_KEY = "tripjournal-location-prompt-asked";
const LOCATION_ALLOWED_COOKIE_KEY = "tripjournal-location-prompt-allowed";

const getCookie = (cookieName: string) => {
    const escapedName = cookieName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
};

const setCookie = (cookieName: string, cookieValue: string, days = 365) => {
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${cookieName}=${encodeURIComponent(cookieValue)}; max-age=${maxAge}; path=/; SameSite=Lax`;
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

        if (geometry?.type === "Polygon") {
            if (pointInPolygon(lng, lat, geometry.coordinates)) {
                return countryName;
            }
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

function Home({ selectedCountries, toggleCountry }: HomeProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [mapViewMode, setMapViewMode] = useState<"globe" | "map">("globe");
    const [userLocation, setUserLocation] = useState<{ lng: number; lat: number } | null>(null);
    const [hasAskedForLocation, setHasAskedForLocation] = useState(() => getCookie(LOCATION_PROMPT_COOKIE_KEY) === "1");
    const [locationPromptAllowed, setLocationPromptAllowed] = useState<boolean | null>(() => {
        const savedValue = getCookie(LOCATION_ALLOWED_COOKIE_KEY);

        if (savedValue === "1") {
            return true;
        }

        if (savedValue === "0") {
            return false;
        }

        return null;
    });
    const hasAttemptedAutoLocateRef = useRef(false);
    const { countriesData, isLoading, error } = useCountriesData();

    useEffect(() => {
        if (!countriesData) {
            return;
        }

        const tryLocateUser = () => {
            if (hasAttemptedAutoLocateRef.current || !navigator.geolocation) {
                return;
            }

            hasAttemptedAutoLocateRef.current = true;

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lng = position.coords.longitude;
                    const lat = position.coords.latitude;
                    setUserLocation({ lng, lat });

                    const countryName = findCountryAtCoordinates(countriesData, lng, lat);
                    if (countryName && !selectedCountries.includes(countryName)) {
                        toggleCountry(countryName);
                    }
                },
                () => {
                    // Ignore geolocation failures and continue without auto-selection.
                },
                {
                    enableHighAccuracy: false,
                    timeout: 10000,
                    maximumAge: 300000
                }
            );
        };

        if (hasAskedForLocation) {
            if (locationPromptAllowed === true) {
                tryLocateUser();
            }

            return;
        }

        setHasAskedForLocation(true);
        setCookie(LOCATION_PROMPT_COOKIE_KEY, "1");

        const shouldLocateUser = window.confirm("Allow TripJournal to use your location and auto-select your country?");
        if (!shouldLocateUser) {
            setLocationPromptAllowed(false);
            setCookie(LOCATION_ALLOWED_COOKIE_KEY, "0");
            return;
        }

        setLocationPromptAllowed(true);
        setCookie(LOCATION_ALLOWED_COOKIE_KEY, "1");
        tryLocateUser();

    }, [countriesData, hasAskedForLocation, locationPromptAllowed, selectedCountries, toggleCountry]);

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
            <section className="mx-auto my-4 w-[min(95vw,1400px)] rounded-[0.8rem] border border-[#eab681] p-4 shadow-[0_3px_14px_rgb(80_48_13_/_15%)]" aria-label="Country filters">
                <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search countries"
                    className="w-full rounded-[0.6rem] border border-[#eab681] px-[0.8rem] py-[0.65rem] font-[Cormorant_Garamond] text-[1.1rem] text-[#50300d] outline-offset-2 focus:outline focus:outline-2 focus:outline-[#eab681]"
                />
                {error && (
                    <p className="mt-3 rounded-lg border border-[#eab681] bg-[#f6dfc1] px-3 py-2 font-[Cormorant_Garamond] text-[1.05rem] text-[#50300d]">
                        {error}
                    </p>
                )}
                {searchTerm.trim().length > 0 && (
                    <div
                        className="mt-[0.85rem] grid max-h-[220px] grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-y-[0.55rem] gap-x-[0.85rem] overflow-y-auto pr-[0.25rem] bg-transparent"
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

            <div className="mx-auto flex w-[min(95vw,1400px)] flex-col items-center justify-center gap-4 px-3 py-3">
                {isLoading || !countriesData ? (
                    <div className="flex h-[min(82vw,82vh)] w-[min(82vw,82vh)] items-center justify-center rounded-full border border-[#eab681] bg-transparent text-center font-[Cormorant_Garamond] text-[1.15rem] text-[#50300d] shadow-[0_3px_14px_rgb(80_48_13_/_12%)]">
                        Loading map data...
                    </div>
                ) : (
                    <Map
                        countriesData={countriesData}
                        selectedCountries={selectedCountries}
                        viewMode={mapViewMode}
                        userLocation={userLocation}
                    />
                )}

                <button
                    type="button"
                    onClick={() => setMapViewMode((prev) => (prev === "globe" ? "map" : "globe"))}
                    className="inline-flex h-[3rem] w-[3rem] items-center justify-center rounded-full border border-[#eab681] text-[1.35rem] text-[#50300d] shadow-[0_3px_10px_rgb(80_48_13_/_14%)] transition hover:bg-[#ffead4]"
                    aria-label="Switch between globe and flat map view"
                >
                    {mapViewMode === "globe" ? "🗺" : "🌐"}
                </button>
            </div>

            <section
                className="mx-auto my-4 grid w-[min(95vw,1400px)] grid-cols-[repeat(3,minmax(0,1fr))] gap-y-[0.55rem] gap-x-[0.85rem] rounded-[0.8rem] border border-[#eab681] p-4 shadow-[0_3px_14px_rgb(80_48_13_/_15%)]"
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