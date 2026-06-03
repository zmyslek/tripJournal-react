alter table public.users
add column if not exists stripe_customer_id text,
add column if not exists stripe_subscription_id text,
add column if not exists stripe_checkout_session_id text;

create index if not exists users_stripe_customer_id_idx
on public.users (stripe_customer_id);

create index if not exists users_stripe_subscription_id_idx
on public.users (stripe_subscription_id);
