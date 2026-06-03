export async function seedSampleData(adminToken?: string) {
    const headers: Record<string,string> = {};
    if (adminToken) headers['x-admin-seed-token'] = adminToken;
    const res = await fetch('/api/admin/seed-sample', { method: 'POST', headers });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`seed request failed: ${res.status} ${text}`);
    }
    return await res.json();
}
