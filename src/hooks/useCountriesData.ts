import { useCallback, useEffect, useState } from "react";
import type { CountriesGeoJson } from "../types/countries";
import { getValue, saveValue } from "../utils/idb";

// The GeoJSON is too large for localStorage, so it is cached in IndexedDB.
const COUNTRIES_CACHE_KEY = "tripjournal:countries:v2";

// Shared across mounts so that navigating back to a page does not load the data again.
let loadedCountries: CountriesGeoJson | null = null;
let countriesRequest: Promise<CountriesGeoJson> | null = null;

async function fetchCountries(): Promise<CountriesGeoJson> {
    const cachedCountries = await getValue<CountriesGeoJson>(COUNTRIES_CACHE_KEY);
    if (cachedCountries) {
        return cachedCountries;
    }

    const response = await fetch(`${import.meta.env.BASE_URL}countries.geojson`, { cache: "force-cache" });
    if (!response.ok) {
        throw new Error(`Failed to fetch countries.geojson: ${response.status}`);
    }

    const data = (await response.json()) as CountriesGeoJson;

    saveValue(COUNTRIES_CACHE_KEY, data).catch((cacheError: unknown) => {
        console.warn("Could not cache countries data", cacheError);
    });

    return data;
}

async function loadCountries(): Promise<CountriesGeoJson> {
    countriesRequest ??= fetchCountries();

    try {
        loadedCountries = await countriesRequest;
        return loadedCountries;
    } catch (loadError) {
        countriesRequest = null;
        throw loadError;
    }
}

export function useCountriesData() {
    const [countriesData, setCountriesData] = useState<CountriesGeoJson | null>(loadedCountries);
    const [error, setError] = useState<string | null>(null);
    const [loadAttempt, setLoadAttempt] = useState(0);

    useEffect(() => {
        if (countriesData) {
            return;
        }

        let isMounted = true;

        const load = async () => {
            try {
                const data = await loadCountries();
                if (isMounted) {
                    setCountriesData(data);
                    setError(null);
                }
            } catch (loadError) {
                if (isMounted) {
                    setError(loadError instanceof Error ? loadError.message : "Failed to load countries data");
                }
            }
        };

        void load();

        return () => {
            isMounted = false;
        };
    }, [countriesData, loadAttempt]);

    const retry = useCallback(() => {
        setError(null);
        setLoadAttempt((previousAttempt) => previousAttempt + 1);
    }, []);

    return { countriesData, isLoading: !countriesData && !error, error, retry };
}
