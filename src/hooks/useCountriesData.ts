import { useEffect, useState } from "react";
import type { CountriesGeoJson } from "../types/countries";

const COUNTRIES_CACHE_KEY = "tripjournal:countries:v1";

function readCachedCountries(): CountriesGeoJson | null {
    try {
        const cachedValue = localStorage.getItem(COUNTRIES_CACHE_KEY);
        if (!cachedValue) {
            return null;
        }

        return JSON.parse(cachedValue) as CountriesGeoJson;
    } catch {
        return null;
    }
}

export function useCountriesData() {
    const cachedCountries = readCachedCountries();
    const [countriesData, setCountriesData] = useState<CountriesGeoJson | null>(() => cachedCountries);
    const [isLoading, setIsLoading] = useState(() => !cachedCountries);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const abortController = new AbortController();

        const loadCountries = async () => {
            try {
                const response = await fetch(`${import.meta.env.BASE_URL}countries.geojson`, {
                    cache: "force-cache",
                    signal: abortController.signal
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch countries.geojson: ${response.status}`);
                }

                const data = (await response.json()) as CountriesGeoJson;
                if (!isMounted) {
                    return;
                }

                setCountriesData(data);
                setError(null);

                try {
                    localStorage.setItem(COUNTRIES_CACHE_KEY, JSON.stringify(data));
                } catch {
                    // Ignore cache write failures.
                }
            } catch (fetchError) {
                if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
                    return;
                }

                if (isMounted) {
                    setError(fetchError instanceof Error ? fetchError.message : "Failed to load countries data");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        if (!countriesData) {
            void loadCountries();
        }

        return () => {
            isMounted = false;
            abortController.abort();
        };
    }, []);

    return { countriesData, isLoading, error };
}
