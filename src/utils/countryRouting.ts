export const encodeCountryParam = (countryName: string): string => {
    return encodeURIComponent(countryName.trim());
};

export const decodeCountryParam = (countryParam: string): string => {
    try {
        return decodeURIComponent(countryParam);
    } catch {
        return countryParam;
    }
};

export const buildCountryTripsPath = (countryName: string): string => {
    return `/trips/${encodeCountryParam(countryName)}`;
};
