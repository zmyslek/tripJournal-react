export const config = { runtime: "edge" };

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };

interface SupabaseUserResponse {
    id: string;
}

interface UserBillingRecord {
    stripe_customer_id: string | null;
}

function getPublicUrl(request: Request): string {
    const configuredUrl = process.env.FRONTEND_URL || process.env.VITE_PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
    if (configuredUrl) {
        return configuredUrl.startsWith("http") ? configuredUrl : `https://${configuredUrl}`;
    }

    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
}

async function getRequestUser(request: Request): Promise<SupabaseUserResponse> {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const authorization = request.headers.get("authorization");

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Missing Supabase environment variables.");
    }

    if (!authorization?.startsWith("Bearer ")) {
        throw new Error("Missing Supabase access token.");
    }

    const response = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/auth/v1/user`, {
        method: "GET",
        headers: {
            apikey: supabaseAnonKey,
            authorization
        }
    });

    if (!response.ok) {
        throw new Error("Invalid or expired Supabase session.");
    }

    return response.json();
}

async function getBillingRecord(userId: string): Promise<UserBillingRecord | null> {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Missing Supabase URL or service role key.");
    }

    const response = await fetch(
        `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/users?id=eq.${encodeURIComponent(userId)}&select=stripe_customer_id`,
        {
            method: "GET",
            headers: {
                apikey: serviceRoleKey,
                authorization: `Bearer ${serviceRoleKey}`
            }
        }
    );

    if (!response.ok) {
        throw new Error("Unable to load billing profile.");
    }

    const rows = (await response.json()) as UserBillingRecord[];
    return rows[0] ?? null;
}

async function createStripePortalSession(customerId: string, request: Request): Promise<Response> {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        return new Response(JSON.stringify({ error: "Missing STRIPE_SECRET_KEY." }), { status: 500, headers: jsonHeaders });
    }

    const body = new URLSearchParams({
        customer: customerId,
        return_url: `${getPublicUrl(request).replace(/\/+$/, "")}/settings`
    });

    const response = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
        method: "POST",
        headers: {
            authorization: `Bearer ${secretKey}`,
            "content-type": "application/x-www-form-urlencoded"
        },
        body
    });

    const payload = await response.json();
    if (!response.ok) {
        return new Response(JSON.stringify({ error: payload.error?.message || "Stripe billing portal failed." }), {
            status: response.status,
            headers: jsonHeaders
        });
    }

    return new Response(JSON.stringify({ url: payload.url }), { status: 200, headers: jsonHeaders });
}

export default async function handler(request: Request): Promise<Response> {
    if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: jsonHeaders });
    }

    try {
        const user = await getRequestUser(request);
        const billingRecord = await getBillingRecord(user.id);

        if (!billingRecord?.stripe_customer_id) {
            return new Response(JSON.stringify({ error: "No Stripe customer exists for this account yet." }), {
                status: 404,
                headers: jsonHeaders
            });
        }

        return createStripePortalSession(billingRecord.stripe_customer_id, request);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to create billing portal session.";
        const status = message.includes("Supabase") || message.includes("session") || message.includes("token") ? 401 : 500;
        return new Response(JSON.stringify({ error: message }), { status, headers: jsonHeaders });
    }
}
