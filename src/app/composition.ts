import { createCountryStatusService } from "../application/country/CountryStatusService.ts";
import { SupabaseCountryStatusRepository } from "../infrastructure/country/SupabaseCountryStatusRepository.ts";

const countryStatusRepository = new SupabaseCountryStatusRepository();

export const appDependencies = {
    countryStatus: createCountryStatusService(countryStatusRepository)
};