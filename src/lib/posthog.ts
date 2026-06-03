import posthog from "posthog-js";

const COOKIE_CONSENT_KEY = "tripjournal:cookie-consent:v1";
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY?.trim() ?? "";
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST?.trim() || "https://app.posthog.com";
const POSTHOG_ENABLED = (import.meta.env.VITE_POSTHOG_ENABLED ?? "true") !== "false" && POSTHOG_KEY.length > 0;

let analyticsAllowed = false;
let posthogInitialized = false;
let listenersAttached = false;
let lastPageviewUrl: string | null = null;

function isBrowser(): boolean {
    return typeof window !== "undefined";
}

function initPostHog(): void {
    if (!POSTHOG_ENABLED || posthogInitialized || !analyticsAllowed || !isBrowser()) {
        return;
    }

    posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        capture_pageview: false,
        autocapture: true,
        persistence: "localStorage"
    });
    posthogInitialized = true;
}

function capturePageview(): void {
    if (!POSTHOG_ENABLED || !analyticsAllowed || !isBrowser()) {
        return;
    }

    initPostHog();
    if (!posthogInitialized) {
        return;
    }

    const currentUrl = window.location.href;
    if (currentUrl === lastPageviewUrl) {
        return;
    }

    lastPageviewUrl = currentUrl;
    posthog.capture("$pageview", { $current_url: currentUrl });
}

function safeReason(reason: unknown): string {
    if (typeof reason === "string") {
        return reason;
    }

    try {
        return JSON.stringify(reason);
    } catch {
        return String(reason);
    }
}

export function attachPostHogListeners(): void {
    if (!isBrowser() || listenersAttached) {
        return;
    }

    listenersAttached = true;

    window.addEventListener("hashchange", capturePageview);
    window.addEventListener("error", (event) => {
        if (!analyticsAllowed) {
            return;
        }

        initPostHog();
        if (!posthogInitialized) {
            return;
        }

        const errorEvent = event as ErrorEvent;
        posthog.capture("frontend_error", {
            message: errorEvent.message,
            filename: errorEvent.filename,
            lineno: errorEvent.lineno,
            colno: errorEvent.colno
        });
    });

    window.addEventListener("unhandledrejection", (event) => {
        if (!analyticsAllowed) {
            return;
        }

        initPostHog();
        if (!posthogInitialized) {
            return;
        }

        const reason = (event as PromiseRejectionEvent).reason;
        posthog.capture("unhandled_promise_rejection", { reason: safeReason(reason) });
    });

    capturePageview();
}

export function setPostHogConsentFromStorage(): void {
    if (!isBrowser()) {
        return;
    }

    try {
        const storedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
        setPostHogConsent(storedConsent === "accepted");
    } catch {
        setPostHogConsent(false);
    }
}

export function setPostHogConsent(allowed: boolean): void {
    analyticsAllowed = allowed && POSTHOG_ENABLED;

    if (!analyticsAllowed) {
        lastPageviewUrl = null;
        if (posthogInitialized) {
            posthog.reset(true);
            posthog.opt_out_capturing();
        }
        return;
    }

    initPostHog();
    if (posthogInitialized) {
        posthog.opt_in_capturing();
    }
    capturePageview();
}

export function capturePostHogEvent(eventName: string, properties?: Record<string, unknown>): void {
    if (!analyticsAllowed) {
        return;
    }

    initPostHog();
    if (!posthogInitialized) {
        return;
    }

    posthog.capture(eventName, properties);
}

export function identifyPostHogUser(distinctId: string, properties?: Record<string, unknown>): void {
    if (!analyticsAllowed) {
        return;
    }

    initPostHog();
    if (!posthogInitialized) {
        return;
    }

    posthog.identify(distinctId, properties);
}

export function resetPostHogIdentity(): void {
    if (!posthogInitialized) {
        return;
    }

    posthog.reset(true);
    posthog.opt_out_capturing();
    lastPageviewUrl = null;
}
