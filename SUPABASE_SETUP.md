# Supabase Email Login Setup

The app now uses Supabase Auth for passwordless email login and scopes Cloudflare KV data to the authenticated Supabase user.

## 1. Create a Supabase project

Create a project at https://supabase.com/dashboard.

## 2. Configure email authentication

In Authentication settings, keep Email enabled.

The app uses `signInWithOtp` with a redirect URL, which sends a one-time magic link by default.

## 3. Add the Worker URL as a redirect URL

Add:

`https://cashflow-expense-manager.basithkmpm.workers.dev`

as the Site URL / allowed redirect URL in Supabase Auth URL configuration.

## 4. Get the client credentials

From Supabase Project Settings > API, copy:

- Project URL
- Publishable key (or legacy anon key)

Do not use the service_role/secret key in this app.

## 5. Add Cloudflare variables

In Cloudflare Workers & Pages > cashflow-expense-manager > Settings > Builds, add these build variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Use the same two values for the Worker runtime variables/secrets if Cloudflare presents separate runtime configuration.

The publishable/anon key is intended for client-side Supabase Auth. Never put a Supabase service_role/secret key in `NEXT_PUBLIC_*` variables.

## 6. Redeploy

Push/redeploy the Worker after adding the variables.

On the first authenticated login, the app claims the existing single-user KV data and moves it into a user-scoped namespace. Later users get their own empty data namespace.
