export const config = { runtime: "edge" };

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };

type SubscriptionPlan = "free" | "monthly" | "yearly" | "lifetime" | "beta-lifetime";
type SubscriptionStatus = "inactive" | "trialing" | "active" | "canceled" | "expired" | "past_due";

interface StripeEvent<T = any> {
    id: string;
    type: string;
    data: {
        object: T;
    };
}

interface CheckoutSession {
    id: string;
    customer?: string;
    subscription?: string;
    payment_status?: string;
    client_reference_id?: string;
    metadata?: Record<string, string>;
}

interface StripeSubscription {
    id: string;
    customer?: string;
    status?: string;
    current_period_end?: number;
    metadata?: Record<string, string>;
}

function isSubscriptionPlan(value: unknown): value is SubscriptionPlan {
    return value === "monthly" || value === "yearly" || value === "lifetime";
}

function mapStripeSubscriptionStatus(status: string | undefined): SubscriptionStatus {
    if (status === "active") return "active";
    if (status === "trialing") return "trialing";
    if (status === "past_due" || status === "unpaid") return "past_due";
    if (status === "canceled") return "canceled";
    if (status === "incomplete_expired") return "expired";
    return "inactive";
}

function parseStripeSignature(signature: string | null): { timestamp: string; signatures: string[] } {
    if (!signature) {
        return { timestamp: "", signatures: [] };
    }

    return signature.split(",").reduce(
        (result, part) => {
            const [key, value] = part.split("=");
            if (key === "t" && value) result.timestamp = value;
            if (key === "v1" && value) result.signatures.push(value);
            return result;
        },
        { timestamp: "", signatures: [] as string[] }
    );
}

function bytesToHex(bytes: ArrayBuffer): string {
    return Array.from(new Uint8Array(bytes))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

async function verifyStripeSignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        throw new Error("Missing STRIPE_WEBHOOK_SECRET.");
    }

    const { timestamp, signatures } = parseStripeSignature(signatureHeader);
    if (!timestamp || signatures.length === 0) {
        return false;
    }

    const signedPayload = `${timestamp}.${rawBody}`;
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(webhookSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
    const expectedSignature = bytesToHex(digest);

    return signatures.some((signature) => signature.length === expectedSignature.length && signature === expectedSignature);
}

async function updateSupabaseUser(userId: string, payload: Record<string, string | null>): Promise<void> {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Missing Supabase URL or service role key.");
    }

    const response = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/rest/v1/users?id=eq.${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: {
            "content-type": "application/json",
            apikey: serviceRoleKey,
            authorization: `Bearer ${serviceRoleKey}`,
            Prefer: "return=minimal"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(`Supabase subscription update failed: ${response.status} ${message}`);
    }
}

async function handleCheckoutCompleted(session: CheckoutSession): Promise<void> {
    const userId = session.metadata?.user_id || session.client_reference_id;
    const plan = session.metadata?.plan;

    if (!userId || !isSubscriptionPlan(plan)) {
        return;
    }

    await updateSupabaseUser(userId, {
        subscription_tier: plan,
        subscription_status: "active",
        subscription_ends_at: null,
        stripe_customer_id: session.customer || null,
        stripe_subscription_id: session.subscription || null,
        stripe_checkout_session_id: session.id
    });
}

async function handleSubscriptionChanged(subscription: StripeSubscription): Promise<void> {
    const userId = subscription.metadata?.user_id;
    const plan = subscription.metadata?.plan;

    if (!userId || !isSubscriptionPlan(plan)) {
        return;
    }

    const subscriptionEndsAt = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null;

    await updateSupabaseUser(userId, {
        subscription_tier: plan,
        subscription_status: mapStripeSubscriptionStatus(subscription.status),
        subscription_ends_at: subscriptionEndsAt,
        stripe_customer_id: subscription.customer || null,
        stripe_subscription_id: subscription.id
    });
}

export default async function handler(request: Request): Promise<Response> {
    if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: jsonHeaders });
    }

    const rawBody = await request.text();

    try {
        const isVerified = await verifyStripeSignature(rawBody, request.headers.get("stripe-signature"));
        if (!isVerified) {
            return new Response(JSON.stringify({ error: "Invalid Stripe signature." }), { status: 400, headers: jsonHeaders });
        }

        const event = JSON.parse(rawBody) as StripeEvent;
        if (event.type === "checkout.session.completed") {
            await handleCheckoutCompleted(event.data.object as CheckoutSession);
        }

        if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
            await handleSubscriptionChanged(event.data.object as StripeSubscription);
        }

        return new Response(JSON.stringify({ received: true }), { status: 200, headers: jsonHeaders });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Webhook handling failed.";
        return new Response(JSON.stringify({ error: message }), { status: 400, headers: jsonHeaders });
    }
}
