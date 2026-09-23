import type { CountryAddedDateMap, CountryStatusMap, CountryStatusState } from "../../application/country/CountryStatusService.ts";

const COUNTRY_STATUS_CACHE_KEY = "tripjournal:country-statuses:v1";
const COUNTRY_ADDED_CACHE_KEY = "tripjournal:country-added-dates:v1";

function readJson(key: string): unknown {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : {};
    } catch {
        return {};
    }
}

function readStatuses(): CountryStatusMap {
    const parsed = readJson(COUNTRY_STATUS_CACHE_KEY);
    if (!parsed || typeof parsed !== "object") {
        return {};
    }

    const statuses: CountryStatusMap = {};
    Object.entries(parsed).forEach(([countryName, status]) => {
        if (countryName.trim() && typeof status === "string" && (status === "want-to-go" || status === "visited" || status === "want-to-visit-again")) {
            statuses[countryName] = status;
        }
    });
    return statuses;
}

function readAddedDates(): CountryAddedDateMap {
    const parsed = readJson(COUNTRY_ADDED_CACHE_KEY);
    if (!parsed || typeof parsed !== "object") {
        return {};
    }

    const dates: CountryAddedDateMap = {};
    Object.entries(parsed).forEach(([countryName, value]) => {
        if (!countryName.trim() || typeof value !== "string" || Number.isNaN(new Date(value).getTime())) {
            return;
        }
        dates[countryName] = new Date(value).toISOString();
    });
    return dates;
}

export function loadCountryStatusState(): CountryStatusState {
    return { statuses: readStatuses(), addedDates: readAddedDates() };
}

export function saveCountryStatusState(state: CountryStatusState): void {
    try {
        localStorage.setItem(COUNTRY_STATUS_CACHE_KEY, JSON.stringify(state.statuses));
        localStorage.setItem(COUNTRY_ADDED_CACHE_KEY, JSON.stringify(state.addedDates));
    } catch {
        // Local storage is an optional cache; the in-memory state remains authoritative.
    }
}