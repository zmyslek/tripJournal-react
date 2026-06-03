#!/usr/bin/env node
/*
Usage:
  SUPABASE_URL=https://<project>.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=<service-role> \
  node scripts/set-lifetime.mjs zuzia.myslek@gmail.com other@example.com

This script updates `public.users` rows for the provided emails to set
`subscription_tier = 'lifetime'` and `subscription_status = 'active'`.

IMPORTANT: this requires the Supabase service role key. Do NOT commit
the key. Run locally or in a safe CI environment.
*/

import fetch from 'node-fetch';

const [,, ...emails] = process.argv;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
    process.exit(2);
}

if (!emails || emails.length === 0) {
    console.error('Provide one or more email addresses as arguments.');
    console.error('Example: node scripts/set-lifetime.mjs user@example.com');
    process.exit(2);
}

async function patchEmail(email) {
    const url = `${SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/users?email=eq.${encodeURIComponent(email)}`;
    const body = {
        subscription_tier: 'lifetime',
        subscription_status: 'active',
        subscription_ends_at: null
    };

    const res = await fetch(url, {
        method: 'PATCH',
        headers: {
            'apikey': SERVICE_ROLE,
            'Authorization': `Bearer ${SERVICE_ROLE}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to update ${email}: ${res.status} ${text}`);
    }

    const json = await res.json();
    return json;
}

(async () => {
    for (const email of emails) {
        try {
            console.log(`Updating ${email}...`);
            const result = await patchEmail(email);
            console.log('Result:', JSON.stringify(result, null, 2));
        } catch (err) {
            console.error('Error for', email, err?.message || err);
        }
    }
})();
