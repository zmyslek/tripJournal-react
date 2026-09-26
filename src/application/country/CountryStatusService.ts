import { changeCountryStatus, type CountryStatus } from "../../domain/country/Country.ts";
import type { CountryStatusRepository } from "./CountryStatusRepository.ts";

export type CountryStatusMap = Record<string, CountryStatus>;
export type CountryAddedDateMap = Record<string, string>;

export interface CountryStatusState {
    statuses: CountryStatusMap;
    addedDates: CountryAddedDateMap;
}

export interface CountryStatusService {
    load(): CountryStatusState;
    save(state: CountryStatusState): void;
    update(state: CountryStatusState, countryName: string, status: CountryStatus | null): CountryStatusState;
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

export function createCountryStatusService(repository: CountryStatusRepository): CountryStatusService {
    return {
        load: () => repository.load(),
        save: (state) => repository.save(state),
        update: (state, countryName, status) => updateCountryStatus(state, countryName, status)
    };
}