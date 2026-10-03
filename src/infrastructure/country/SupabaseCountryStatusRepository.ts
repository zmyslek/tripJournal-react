import { supabase } from "../../lib/supabase/client";
import type { CountryStatusRepository } from "../../application/country/CountryStatusRepository";
import type { CountryStatusState } from "../../application/country/CountryStatusService";
import type { CountryStatus } from "../../domain/country/Country";
import { LocalCountryStatusRepository } from "./LocalCountryStatusRepository";

interface CountryStatusRow {
    country_name: string;
    status: CountryStatus;
    added_at: string;
}

function rowsToState(rows: CountryStatusRow[]): CountryStatusState {
    return rows.reduce<CountryStatusState>((state, row) => {
        state.statuses[row.country_name] = row.status;
        state.addedDates[row.country_name] = row.added_at;
        return state;
    }, { statuses: {}, addedDates: {} });
}

export class SupabaseCountryStatusRepository implements CountryStatusRepository {
    private readonly localRepository = new LocalCountryStatusRepository();

    async load(): Promise<CountryStatusState> {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            throw sessionError;
        }

        const user = sessionData.session?.user;
        if (!user) {
            return this.localRepository.load();
        }

        const { data, error } = await supabase
            .from("country_statuses")
            .select("country_name, status, added_at")
            .eq("user_id", user.id);

        if (error) {
            throw error;
        }

        const cloudState = rowsToState((data ?? []) as CountryStatusRow[]);
        if (Object.keys(cloudState.statuses).length === 0) {
            const localState = await this.localRepository.load();
            if (Object.keys(localState.statuses).length > 0) {
                await this.saveForUser(user.id, localState);
                return localState;
            }
        }

        return cloudState;
    }

    async save(state: CountryStatusState): Promise<void> {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            throw sessionError;
        }

        const user = sessionData.session?.user;
        if (!user) {
            await this.localRepository.save(state);
            return;
        }

        await this.saveForUser(user.id, state);
    }

    private async saveForUser(userId: string, state: CountryStatusState): Promise<void> {
        const rows = Object.entries(state.statuses).map(([countryName, status]) => ({
            user_id: userId,
            country_name: countryName,
            status,
            added_at: state.addedDates[countryName] ?? new Date().toISOString()
        }));

        if (rows.length > 0) {
            const { error } = await supabase
                .from("country_statuses")
                .upsert(rows, { onConflict: "user_id,country_name" });

            if (error) {
                throw error;
            }
        }

        const { data: existingRows, error: existingError } = await supabase
            .from("country_statuses")
            .select("country_name")
            .eq("user_id", userId);

        if (existingError) {
            throw existingError;
        }

        const namesToDelete = ((existingRows ?? []) as Array<{ country_name: string }>)
            .map(row => row.country_name)
            .filter(countryName => !state.statuses[countryName]);

        if (namesToDelete.length > 0) {
            const { error } = await supabase
                .from("country_statuses")
                .delete()
                .eq("user_id", userId)
                .in("country_name", namesToDelete);

            if (error) {
                throw error;
            }
        }
    }
}
