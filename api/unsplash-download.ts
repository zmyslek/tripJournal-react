export default async function handler(request: Request): Promise<Response> {
    if (request.method !== "POST") {
        return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
    }

    const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim();
    if (!accessKey) {
        return Response.json({ error: "Unsplash is not configured" }, { status: 503 });
    }

    let downloadLocation: string | undefined;
    try {
        const body = await request.json() as { download_location?: unknown };
        downloadLocation = typeof body.download_location === "string" ? body.download_location : undefined;
    } catch {
        return Response.json({ error: "A valid download_location is required" }, { status: 400 });
    }

    if (!downloadLocation) {
        return Response.json({ error: "A valid download_location is required" }, { status: 400 });
    }

    let downloadUrl: URL;
    try {
        downloadUrl = new URL(downloadLocation);
    } catch {
        return Response.json({ error: "A valid Unsplash download_location is required" }, { status: 400 });
    }

    if (downloadUrl.origin !== "https://api.unsplash.com" || !downloadUrl.pathname.startsWith("/photos/")) {
        return Response.json({ error: "Only Unsplash download locations are allowed" }, { status: 400 });
    }

    try {
        const upstreamResponse = await fetch(downloadUrl, {
            headers: {
                Accept: "application/json",
                Authorization: `Client-ID ${accessKey}`
            }
        });

        if (!upstreamResponse.ok) {
            return Response.json({ error: "Unsplash download registration failed" }, { status: 502 });
        }

        return new Response(null, { status: 204 });
    } catch {
        return Response.json({ error: "Unsplash is temporarily unavailable" }, { status: 502 });
    }
}
