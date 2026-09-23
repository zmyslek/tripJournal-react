import { changeCountryStatus, type CountryStatus } from "../../domain/country/Country.ts";

export type CountryStatusMap = Record<string, CountryStatus>;
export type CountryAddedDateMap = Record<string, string>;

export interface CountryStatusState {
    statuses: CountryStatusMap;
    addedDates: CountryAddedDateMap;
}

export function updateCountryStatus(
    state: CountryStatusState,
    countryName: string,
    status: CountryStatus | null,
    now = new Date().toISOString()
): CountryStatusState {
    const currentCountryStatus = state.statuses[countryName];
    const currentCountryDate = state.addedDates[countryName];
    const currentCountry = currentCountryStatus && currentCountryDate
        ? { name: countryName, status: currentCountryStatus, addedAt: currentCountryDate }
        : undefined;
    const updatedCountry = changeCountryStatus(currentCountry, countryName, status, now);

    if (!updatedCountry) {
        const statuses = { ...state.statuses };
        const addedDates = { ...state.addedDates };
        delete statuses[countryName];
        delete addedDates[countryName];
        return { statuses, addedDates };
    }

    return {
        statuses: { ...state.statuses, [countryName]: updatedCountry.status },
        addedDates: { ...state.addedDates, [countryName]: updatedCountry.addedAt }
    };
}