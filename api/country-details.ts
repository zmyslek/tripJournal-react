type RestCountry = {
    name?: { common?: string; official?: string };
    region?: string;
    capital?: string[];
    population?: number;
    languages?: Record<string, string>;
};

export default async function handler(request: Request): Promise<Response> {
    const countryName = new URL(request.url).searchParams.get("name")?.trim();

    if (!countryName) {
        return Response.json({ error: "Country name is required" }, { status: 400 });
    }

    const upstreamUrl = `https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}?fullText=true`;

    try {
        const upstreamResponse = await fetch(upstreamUrl, {
            headers: { Accept: "application/json" }
        });

        if (!upstreamResponse.ok) {
            return Response.json(
                { error: `Country details request failed with status ${upstreamResponse.status}` },
                { status: upstreamResponse.status === 404 ? 404 : 502 }
            );
        }

        const data = await upstreamResponse.json() as RestCountry[];
        return Response.json(data, {
            headers: {
                "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800"
            }
        });
    } catch {
        return Response.json({ error: "Country details are temporarily unavailable" }, { status: 502 });
    }
}
