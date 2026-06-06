export async function seedSampleData(adminToken?: string, basicUser?: string, basicPass?: string) {
    const headers: Record<string,string> = {};
    if (adminToken) headers['x-admin-seed-token'] = adminToken;

    const encodeBase64 = (input: string) => {
        if (typeof btoa === 'function') {
            return btoa(input);
        }

        try {
            return (globalThis as unknown as { Buffer?: { from: (s: string) => { toString: (e: string) => string } } }).Buffer?.from(input).toString('base64') ?? '';
        } catch {
            return '';
        }
    };

    if (basicUser && typeof basicPass === 'string') {
        const b64 = encodeBase64(`${basicUser}:${basicPass}`);
        headers['authorization'] = `Basic ${b64}`;
    }

    const res = await fetch('/api/admin/seed-sample', { method: 'POST', headers });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`seed request failed: ${res.status} ${text}`);
    }
    return await res.json();
}
