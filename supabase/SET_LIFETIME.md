Manually set users to lifetime subscription

This repository includes a small Node script to update users in the `public.users` table
to have `subscription_tier = 'lifetime'` and `subscription_status = 'active'`.

Files
- `scripts/set-lifetime.mjs` — Node script that PATCHes the Supabase REST endpoint for `users`.

How to run (locally)
---------------------
1. Install Node (v18+ recommended). Ensure `node` is on your PATH.
2. Run the script with the Supabase service role key and project url in the environment. Example:

```bash
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here" \
node scripts/set-lifetime.mjs zuzia.myslek@gmail.com
```

3. The script will PATCH each matching user by email and print the returned representation.

Security notes
--------------
- `SUPABASE_SERVICE_ROLE_KEY` is powerful — never expose it client-side or commit it.
- Run the script on a trusted machine or inside secure CI; prefer ephemeral credentials.
- Alternatively, you can run an equivalent SQL directly in the Supabase SQL Editor (see below).

Equivalent SQL (Supabase SQL Editor)
------------------------------------
```sql
UPDATE public.users
SET subscription_tier = 'lifetime', subscription_status = 'active', subscription_ends_at = NULL
WHERE email = 'zuzia.myslek@gmail.com'
RETURNING id, email, subscription_tier, subscription_status;
```
