interface UnsplashPhotoResponse {
    urls: {
        regular: string;
        small: string;
    };
    links: {
        download_location: string;
    };
    user: {
        name: string;
        links: {
            html: string;
        };
    };
}

export default async function handler(request: Request): Promise<Response> {
    const photoId = new URL(request.url).searchParams.get("id")?.trim();
    const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim();

    if (!photoId) {
        return Response.json({ error: "Photo id is required" }, { status: 400 });
    }

    if (!accessKey) {
        return Response.json({ error: "Unsplash is not configured" }, { status: 503 });
    }

    try {
        const upstreamResponse = await fetch(`https://api.unsplash.com/photos/${encodeURIComponent(photoId)}`, {
            headers: {
                Accept: "application/json",
                Authorization: `Client-ID ${accessKey}`
            }
        });

        if (!upstreamResponse.ok) {
            return Response.json(
                { error: `Unsplash photo request failed with status ${upstreamResponse.status}` },
                { status: upstreamResponse.status === 404 ? 404 : 502 }
            );
        }

        const data = await upstreamResponse.json() as UnsplashPhotoResponse;
        return Response.json(data, {
            headers: {
                "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800"
            }
        });
    } catch {
        return Response.json({ error: "Unsplash is temporarily unavailable" }, { status: 502 });
    }
}
