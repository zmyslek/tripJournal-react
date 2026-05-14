import { useEffect, useReducer } from "react";

export interface CountryDetails {
    name: string;
    description: string;
    capital?: string;
    region?: string;
    population?: number;
    languages?: string[];
}

const CACHE_KEY = "tripjournal:country-details:v1";

interface CachedCountryDetails extends CountryDetails {
    fetchedAt: string;
}

interface State {
    details: CountryDetails | null;
    isLoading: boolean;
    error: string | null;
}

type Action =
    | { type: "set_cached"; payload: CountryDetails }
    | { type: "start_loading" }
    | { type: "set_success"; payload: CountryDetails }
    | { type: "set_error"; payload: string };

function detailsReducer(state: State, action: Action): State {
    if (action.type === "set_cached") {
        return { details: action.payload, isLoading: false, error: null };
    }

    if (action.type === "start_loading") {
        return { ...state, isLoading: true, error: null };
    }

    if (action.type === "set_success") {
        return { details: action.payload, isLoading: false, error: null };
    }

    if (action.type === "set_error") {
        return { details: null, isLoading: false, error: action.payload };
    }

    return state;
}

function readCountryCache(countryName: string): CountryDetails | null {
    try {
        const cacheData = localStorage.getItem(CACHE_KEY);
        if (!cacheData) {
            return null;
        }

        const cache = JSON.parse(cacheData) as Record<string, CachedCountryDetails>;
        const cached = cache[countryName.toLowerCase()];

        if (!cached) {
            return null;
        }

        const fetchedAt = new Date(cached.fetchedAt);
        const now = new Date();
        const daysSince = (now.getTime() - fetchedAt.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSince > 30) {
            return null;
        }

        return {
            name: cached.name,
            description: cached.description,
            capital: cached.capital,
            region: cached.region,
            population: cached.population,
            languages: cached.languages
        };
    } catch {
        return null;
    }
}

function writeCountryCache(details: CountryDetails): void {
    try {
        const cacheData = localStorage.getItem(CACHE_KEY);
        const cache = cacheData ? JSON.parse(cacheData) as Record<string, CachedCountryDetails> : {};

        cache[details.name.toLowerCase()] = {
            ...details,
            fetchedAt: new Date().toISOString()
        };

        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {
        // Ignore cache write failures
    }
}

export function useCountryDetails(countryName: string) {
    const cachedDetails = readCountryCache(countryName);
    const initialState: State = cachedDetails
        ? { details: cachedDetails, isLoading: false, error: null }
        : { details: null, isLoading: false, error: null };

    const [state, dispatch] = useReducer(detailsReducer, initialState);

    useEffect(() => {
        if (!countryName.trim()) {
            return;
        }

        const cached = readCountryCache(countryName);
        if (cached) {
            dispatch({ type: "set_cached", payload: cached });
            return;
        }

        let cancelled = false;
        dispatch({ type: "start_loading" });

        const fetchDetails = async () => {
            try {
                const response = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}?fullText=true`);

                if (!response.ok) {
                    throw new Error(`API responded with ${response.status}`);
                }

                const data = await response.json() as Array<Record<string, unknown>>;

                if (!Array.isArray(data) || data.length === 0) {
                    throw new Error("No country found");
                }

                const country = data[0];
                const officialName = (country.name as Record<string, string> | undefined)?.official ?? (country.name as Record<string, string> | undefined)?.common ?? countryName;
                const regionString = country.region as string | undefined;
                const capitalArray = country.capital as string[] | undefined;
                const populationNumber = country.population as number | undefined;
                const languagesObj = country.languages as Record<string, string> | undefined;

                const description = `${officialName} is a country in ${regionString || "the world"}. ${
                    capitalArray && capitalArray.length > 0 ? `The capital is ${capitalArray.join(", ")}. ` : ""
                }${
                    populationNumber ? `The population is approximately ${(populationNumber / 1_000_000).toFixed(1)} million people. ` : ""
                }`.trim();

                const details: CountryDetails = {
                    name: officialName,
                    description,
                    capital: capitalArray?.[0],
                    region: regionString,
                    population: populationNumber,
                    languages: languagesObj ? Object.values(languagesObj) : undefined
                };

                if (!cancelled) {
                    dispatch({ type: "set_success", payload: details });
                    writeCountryCache(details);
                }
            } catch (fetchError) {
                if (!cancelled) {
                    dispatch({
                        type: "set_error",
                        payload: fetchError instanceof Error ? fetchError.message : "Could not load country details"
                    });
                }
            }
        };

        void fetchDetails();

        return () => {
            cancelled = true;
        };
    }, [countryName]);

    return state;
}
