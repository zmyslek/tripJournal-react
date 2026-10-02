import type { CountryStatusState } from "./CountryStatusService.ts";

export interface CountryStatusRepository {
    load(): Promise<CountryStatusState>;
    save(state: CountryStatusState): Promise<void>;
}