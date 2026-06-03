Admin seed endpoint — usage and security

Purpose
-------
This document explains how to use the protected admin seed endpoint at `/api/admin/seed-sample` and how to configure environment variables required to run it safely.

Environment variables (server-side only)
---------------------------------------
- `VITE_SUPABASE_URL` — your Supabase project URL (also used client-side).
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only). Required.
- `ADMIN_SEED_TOKEN` — secret token used to authorize seed requests (server-only). Required.
- `ADMIN_SEED_BASIC_USER` — optional basic auth username. If set, basic auth is required in addition to `ADMIN_SEED_TOKEN`.
- `ADMIN_SEED_BASIC_PASS` — optional basic auth password. If `ADMIN_SEED_BASIC_USER` is set, this must also be set.
- `ADMIN_SEED_ALLOWED_IPS` — optional comma-separated list of allowed caller IP addresses. If set, requests must originate from one of these IPs (relies on `x-forwarded-for` or similar headers from the platform).

How the endpoint protects itself
-------------------------------
- If `ADMIN_SEED_BASIC_USER` is set, the endpoint requires BOTH a valid Basic Auth header matching `ADMIN_SEED_BASIC_USER`/`ADMIN_SEED_BASIC_PASS` and the `x-admin-seed-token` header matching `ADMIN_SEED_TOKEN`.
- If `ADMIN_SEED_BASIC_USER` is not set, the endpoint requires the `x-admin-seed-token` header.
- If `ADMIN_SEED_ALLOWED_IPS` is set, the request must include an IP in `x-forwarded-for` (or platform equivalent) that matches one of the listed allowed IPs.

Calling the endpoint (curl examples)
-----------------------------------
Using only token:

```
curl -X POST https://your-deployment.example.com/api/admin/seed-sample \
  -H "x-admin-seed-token: ${ADMIN_SEED_TOKEN}"
```

Using token + basic auth (recommended when configured):

```
curl -X POST https://your-deployment.example.com/api/admin/seed-sample \
  -u "${ADMIN_SEED_BASIC_USER}:${ADMIN_SEED_BASIC_PASS}" \
  -H "x-admin-seed-token: ${ADMIN_SEED_TOKEN}"
```

Notes and best practices
------------------------
- Always set `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_SEED_TOKEN` as environment variables on your hosting provider (Vercel project settings), and never commit them.
- Prefer configuring `ADMIN_SEED_BASIC_USER` and `ADMIN_SEED_BASIC_PASS` plus `ADMIN_SEED_ALLOWED_IPS` for stronger protection.
- Consider disabling the endpoint entirely in production by omitting `ADMIN_SEED_TOKEN` or keeping it in a private staging environment.

Where to find the endpoint
--------------------------
Serverless function: `api/admin/seed-sample.ts`
