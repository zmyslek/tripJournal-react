export const config = { runtime: "edge" };

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };

async function createAuthUser(supabaseUrl: string, serviceKey: string, email: string, password: string) {
    const url = `${supabaseUrl.replace(/\/+$/,'')}/auth/v1/admin/users`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`
        },
        body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`createAuthUser failed: ${res.status} ${text}`);
    }

    return await res.json();
}

// Use PostgREST to insert/upsert rows with service role key
async function restInsert(supabaseUrl: string, serviceKey: string, table: string, payload: Record<string, unknown> | Record<string, unknown>[]) {
    const url = `${supabaseUrl.replace(/\/+$/,'')}/rest/v1/${table}`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            Prefer: "return=representation"
        },
        body: JSON.stringify(Array.isArray(payload) ? payload : [payload])
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`restInsert ${table} failed: ${res.status} ${text}`);
    }

    return await res.json();
}

async function restSelectByEmail(supabaseUrl: string, serviceKey: string, table: string, email: string) {
    const url = `${supabaseUrl.replace(/\/+$/,'')}/rest/v1/${table}?email=eq.${encodeURIComponent(email)}`;
    const res = await fetch(url, {
        method: "GET",
        headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`
        }
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`restSelect ${table} failed: ${res.status} ${text}`);
    }
    return await res.json();
}

export default async function handler(request: Request): Promise<Response> {
    if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: jsonHeaders });
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const ADMIN_TOKEN = process.env.ADMIN_SEED_TOKEN;
    const BASIC_USER = process.env.ADMIN_SEED_BASIC_USER;
    const BASIC_PASS = process.env.ADMIN_SEED_BASIC_PASS;
    const ALLOWED_IPS = process.env.ADMIN_SEED_ALLOWED_IPS; // comma separated

    if (!SUPABASE_URL || !SERVICE_ROLE) {
        return new Response(JSON.stringify({ error: "Missing Supabase URL or service role key in env" }), { status: 500, headers: jsonHeaders });
    }

    // Validate presence of token
    const providedToken = request.headers.get('x-admin-seed-token');
    if (!ADMIN_TOKEN) {
        return new Response(JSON.stringify({ error: "Server not configured: ADMIN_SEED_TOKEN is missing" }), { status: 500, headers: jsonHeaders });
    }

    // If BASIC_USER is set, require both Basic Auth and token. Otherwise token is sufficient.
    if (BASIC_USER) {
        const auth = request.headers.get('authorization') || '';
        if (!auth.startsWith('Basic ')) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Basic auth required' }), { status: 401, headers: jsonHeaders });
        }

        try {
            const b64 = auth.slice('Basic '.length);
            const decoded = atob(b64);
            const [user, pass] = decoded.split(':');
            // constant-time-ish check
            if (!(user === BASIC_USER && pass === BASIC_PASS)) {
                return new Response(JSON.stringify({ error: 'Unauthorized: invalid basic credentials' }), { status: 401, headers: jsonHeaders });
            }
        } catch {
            return new Response(JSON.stringify({ error: 'Unauthorized: invalid basic auth header' }), { status: 401, headers: jsonHeaders });
        }

        if (!providedToken || providedToken !== ADMIN_TOKEN) {
            return new Response(JSON.stringify({ error: 'Unauthorized: missing or invalid admin seed token' }), { status: 401, headers: jsonHeaders });
        }
    } else {
        if (!providedToken || providedToken !== ADMIN_TOKEN) {
            return new Response(JSON.stringify({ error: "Unauthorized: missing or invalid admin seed token" }), { status: 401, headers: jsonHeaders });
        }
    }

    // If ALLOWED_IPS is configured, enforce that the request's forwarded-for header matches one of the allowed IPs
    if (ALLOWED_IPS) {
        const forwarded = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || '';
        const allowedList = ALLOWED_IPS.split(',').map(s => s.trim()).filter(Boolean);
        const matched = allowedList.some(ip => forwarded.includes(ip));
        if (!matched) {
            return new Response(JSON.stringify({ error: 'Unauthorized: caller IP not allowed' }), { status: 401, headers: jsonHeaders });
        }
    }

    try {
        // sample account
        const sampleEmail = "user@example.com";
        const samplePassword = "ChangeMe123!";

        // Check if there is already a profile row
        const existing = await restSelectByEmail(SUPABASE_URL, SERVICE_ROLE, "users", sampleEmail);
        let userId: string | undefined;

        if (existing && existing.length > 0) {
            userId = existing[0].id;
        } else {
            // create an auth user via admin endpoint
            const created = await createAuthUser(SUPABASE_URL, SERVICE_ROLE, sampleEmail, samplePassword);
            userId = created.id;
            // wait briefly for auth trigger to create profile row
            await new Promise((r) => setTimeout(r, 600));
            // patch profile fields
            await fetch(`${SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/users?id=eq.${userId}`, {
                method: "PATCH",
                headers: {
                    "content-type": "application/json",
                    apikey: SERVICE_ROLE,
                    Authorization: `Bearer ${SERVICE_ROLE}`,
                    Prefer: "return=representation"
                },
                body: JSON.stringify({ username: "sample_user", avatar_url: null, subscription_tier: 'free', subscription_status: 'active' })
            });
        }

        if (!userId) throw new Error("Failed to determine user id for seed user");

        // create a sample trip, entry, photo
        const trip = (await restInsert(SUPABASE_URL, SERVICE_ROLE, "trips", {
            user_id: userId,
            title: "Sample Trip to Barcelona",
            status: "planned",
            start_date: null,
            end_date: null,
            is_public: false
        }))[0];

        const entry = (await restInsert(SUPABASE_URL, SERVICE_ROLE, "trip_entries", {
            trip_id: trip.id,
            title: "Day 1 - Arrival",
            body: "Landed and wandered the Gothic Quarter.",
            entry_date: new Date().toISOString().slice(0,10)
        }))[0];

        await restInsert(SUPABASE_URL, SERVICE_ROLE, "trip_destinations", {
            trip_id: trip.id,
            country_code: "ES",
            city: "Barcelona",
            order: 0
        });

        await restInsert(SUPABASE_URL, SERVICE_ROLE, "photos", {
            trip_id: trip.id,
            entry_id: entry.id,
            storage_url: "https://example.com/sample-photo.jpg",
            caption: "Rambla at dusk"
        });

        return new Response(JSON.stringify({ ok: true, user_id: userId, trip_id: trip.id }), { status: 200, headers: jsonHeaders });
    } catch (err) {
        const error = err as Error;
        return new Response(JSON.stringify({ error: error?.message || String(err) }), { status: 500, headers: jsonHeaders });
    }
}
