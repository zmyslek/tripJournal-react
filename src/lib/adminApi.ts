export interface SeedSampleDataResult {
    ok: boolean;
    user_id: string;
    trip_id: string;
    local?: boolean;
}

const LOCAL_SEED_KEY = "tripjournal:local-seed:v1";

export async function seedSampleData(adminToken?: string): Promise<SeedSampleDataResult> {
    if (import.meta.env.DEV) {
        const result: SeedSampleDataResult = {
            ok: true,
            user_id: "local-demo-user",
            trip_id: "local-demo-trip",
            local: true
        };

        try {
            localStorage.setItem(LOCAL_SEED_KEY, JSON.stringify(result));
        } catch {
            // The local demo can still run when browser storage is unavailable.
        }
        return result;
    }

    const headers: Record<string,string> = {};
    if (adminToken) headers['x-admin-seed-token'] = adminToken;
    const res = await fetch('/api/admin/seed-sample', { method: 'POST', headers });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`seed request failed: ${res.status} ${text}`);
    }
    return await res.json() as SeedSampleDataResult;
}
