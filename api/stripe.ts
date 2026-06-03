export const config = { runtime: "edge" };

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };

type CheckoutPlan = "monthly" | "yearly" | "lifetime";

interface SupabaseUserResponse {
    id: string;
    email?: string;
}

const planToPriceEnv: Record<CheckoutPlan, string> = {
    monthly: "STRIPE_PRICE_MONTHLY",
    yearly: "STRIPE_PRICE_YEARLY",
    lifetime: "STRIPE_PRICE_LIFETIME"
};

function getPublicUrl(request: Request): string {
    const configuredUrl = process.env.FRONTEND_URL || process.env.VITE_PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
    if (configuredUrl) {
        return configuredUrl.startsWith("http") ? configuredUrl : `https://${configuredUrl}`;
    }

    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
}

function isCheckoutPlan(plan: unknown): plan is CheckoutPlan {
    return plan === "monthly" || plan === "yearly" || plan === "lifetime";
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

async function createStripeCheckoutSession(params: {
    plan: CheckoutPlan;
    priceId: string;
    user: SupabaseUserResponse;
    request: Request;
}): Promise<Response> {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        return new Response(JSON.stringify({ error: "Missing STRIPE_SECRET_KEY." }), { status: 500, headers: jsonHeaders });
    }

    const appUrl = getPublicUrl(params.request).replace(/\/+$/, "");
    const successUrl = `${appUrl}/settings?checkout=success&checkout_session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}/settings?checkout=canceled`;
    const mode = params.plan === "lifetime" ? "payment" : "subscription";
    const body = new URLSearchParams({
        mode,
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: params.user.id,
        "line_items[0][price]": params.priceId,
        "line_items[0][quantity]": "1",
        "metadata[user_id]": params.user.id,
        "metadata[plan]": params.plan,
        allow_promotion_codes: "true"
    });

    if (params.user.email) {
        body.set("customer_email", params.user.email);
    }

    if (mode === "subscription") {
        body.set("subscription_data[metadata][user_id]", params.user.id);
        body.set("subscription_data[metadata][plan]", params.plan);
    }

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
            authorization: `Bearer ${secretKey}`,
            "content-type": "application/x-www-form-urlencoded"
        },
        body
    });

    const payload = await response.json();
    if (!response.ok) {
        return new Response(JSON.stringify({ error: payload.error?.message || "Stripe checkout session failed." }), {
            status: response.status,
            headers: jsonHeaders
        });
    }

    return new Response(JSON.stringify({ id: payload.id, url: payload.url }), { status: 200, headers: jsonHeaders });
}

export default async function handler(request: Request): Promise<Response> {
    if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: jsonHeaders });
    }

    try {
        const { plan } = await request.json();
        if (!isCheckoutPlan(plan)) {
            return new Response(JSON.stringify({ error: "Choose monthly, yearly, or lifetime." }), { status: 400, headers: jsonHeaders });
        }

        const priceId = process.env[planToPriceEnv[plan]];
        if (!priceId) {
            return new Response(JSON.stringify({ error: `Missing ${planToPriceEnv[plan]}.` }), { status: 500, headers: jsonHeaders });
        }

        const user = await getRequestUser(request);
        return createStripeCheckoutSession({ plan, priceId, user, request });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to create checkout session.";
        const status = message.includes("Supabase") || message.includes("session") || message.includes("token") ? 401 : 500;
        return new Response(JSON.stringify({ error: message }), { status, headers: jsonHeaders });
    }
}
