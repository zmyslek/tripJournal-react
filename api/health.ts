export const config = {
    runtime: "edge"
};

const jsonHeaders = {
    "content-type": "application/json; charset=utf-8"
};

export default function handler(request: Request): Response {
    if (request.method !== "GET") {
        return new Response(
            JSON.stringify({ error: "Method not allowed" }),
            {
                status: 405,
                headers: jsonHeaders
            }
        );
    }

    return new Response(
        JSON.stringify({
            ok: true,
            service: "tripjournal-backend",
            runtime: "edge",
            timestamp: new Date().toISOString()
        }),
        {
            status: 200,
            headers: jsonHeaders
        }
    );
}