import Stripe from 'stripe';

const jsonHeaders = {
    "content-type": "application/json; charset=utf-8"
};

const priceEnvironmentVariables = {
    monthly: "STRIPE_MONTHLY_PRICE_ID",
    yearly: "STRIPE_YEARLY_PRICE_ID",
    lifetime: "STRIPE_LIFETIME_PRICE_ID"
} as const;

type PaidPlan = keyof typeof priceEnvironmentVariables;

function jsonResponse(body: Record<string, string>, status: number): Response {
    return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

export default async function handler(request: Request): Promise<Response> {
    if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        return jsonResponse({ error: "Stripe is not configured on the server" }, 503);
    }

    let plan: string;
    try {
        const body = await request.json() as { plan?: unknown };
        plan = typeof body.plan === "string" ? body.plan : "";
    } catch {
        return jsonResponse({ error: "Invalid request body" }, 400);
    }

    if (!(plan in priceEnvironmentVariables)) {
        return jsonResponse({ error: "A paid subscription plan is required" }, 400);
    }

    const priceId = process.env[priceEnvironmentVariables[plan as PaidPlan]];
    if (!priceId) {
        return jsonResponse({ error: `Stripe price is not configured for ${plan}` }, 503);
    }

    const stripe = new Stripe(secretKey);
    const origin = request.headers.get("origin") ?? new URL(request.url).origin;

    try {
        const session = await stripe.checkout.sessions.create({
            mode: plan === "lifetime" ? "payment" : "subscription",
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${origin}/settings?checkout=success`,
            cancel_url: `${origin}/settings?checkout=cancelled`
        });

        if (!session.url) {
            return jsonResponse({ error: "Stripe did not return a checkout URL" }, 502);
        }

        return jsonResponse({ url: session.url }, 200);
    } catch (error) {
        console.error("[Stripe] Failed to create checkout session", error);
        return jsonResponse({ error: "Unable to start Stripe checkout" }, 502);
    }
}