import { createCountryStatusService } from "../application/country/CountryStatusService.ts";
import { LocalCountryStatusRepository } from "../infrastructure/country/LocalCountryStatusRepository.ts";

const countryStatusRepository = new LocalCountryStatusRepository();

export const appDependencies = {
    countryStatus: createCountryStatusService(countryStatusRepository)
};