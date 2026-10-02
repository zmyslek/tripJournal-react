import { useEffect, useState } from "react";
import type { CountriesGeoJson } from "../types/countries";

// Shared across mounts so that navigating back to a page does not load the data again.
// Across reloads, the browser HTTP cache serves the file ("force-cache").
let loadedCountries: CountriesGeoJson | null = null;
let countriesRequest: Promise<CountriesGeoJson> | null = null;

async function fetchCountries(): Promise<CountriesGeoJson> {
    const response = await fetch(`${import.meta.env.BASE_URL}countries.geojson`, { cache: "force-cache" });
    if (!response.ok) {
        throw new Error(`Failed to fetch countries.geojson: ${response.status}`);
    }

    return (await response.json()) as CountriesGeoJson;
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

    useEffect(() => {
        if (countriesData || error) {
            return;
        }

        let isMounted = true;

        const load = async () => {
            try {
                const data = await loadCountries();
                if (isMounted) {
                    setCountriesData(data);
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
    }, [countriesData, error]);

    const retry = () => setError(null);

    return { countriesData, isLoading: !countriesData && !error, error, retry };
}
