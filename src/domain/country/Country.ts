export type CountryStatus = "want-to-go" | "visited" | "want-to-visit-again";

export interface Country {
    name: string;
    status: CountryStatus;
    addedAt: string;
}

export function changeCountryStatus(
    country: Country | undefined,
    name: string,
    status: CountryStatus | null,
    now: string
): Country | null {
    if (!name.trim()) {
        throw new Error("A country must have a name.");
    }

    if (status === null) {
        return null;
    }

    return {
        name,
        status,
        addedAt: country?.addedAt ?? now
    };
}

export type CountryCollection = Record<string, Country>;

export function isTrackedCountry(status: CountryStatus): boolean {
    return status === "visited" || status === "want-to-visit-again";
}