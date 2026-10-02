const AUTH_CACHE_KEY = "tripjournal:auth:v1";
const GUEST_ACCESS_COUNT_KEY = "tripjournal:guest-access-count:v1";
export const MAX_GUEST_ACCESS = 3;

export function hasStoredAuth(): boolean {
    try {
        const storedAuth = localStorage.getItem(AUTH_CACHE_KEY);
        if (!storedAuth) {
            return false;
        }

        const parsedAuth: unknown = JSON.parse(storedAuth);
        return Boolean(parsedAuth && typeof parsedAuth === "object" && "email" in parsedAuth && parsedAuth.email);
    } catch {
        return false;
    }
}

export function getGuestAccessCount(): number {
    try {
        const storedCount = Number.parseInt(localStorage.getItem(GUEST_ACCESS_COUNT_KEY) ?? "0", 10);
        return Number.isFinite(storedCount) && storedCount >= 0 ? storedCount : 0;
    } catch {
        return 0;
    }
}

export function recordGuestAccess(): number {
    const nextCount = Math.min(getGuestAccessCount() + 1, MAX_GUEST_ACCESS);

    try {
        localStorage.setItem(GUEST_ACCESS_COUNT_KEY, String(nextCount));
    } catch {
        // Keep the current navigation usable if browser storage is unavailable.
    }

    return nextCount;
}

export function canAccessAsGuest(): boolean {
    return getGuestAccessCount() > 0 && getGuestAccessCount() <= MAX_GUEST_ACCESS;
}