import type { CountryStatusState } from "./CountryStatusService.ts";

export interface CountryStatusRepository {
    load(): CountryStatusState;
    save(state: CountryStatusState): void;
}