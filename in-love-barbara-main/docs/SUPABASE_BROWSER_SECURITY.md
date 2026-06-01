# Supabase browser security

The Vite app must only use browser-safe Supabase credentials:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Never ship `service_role` keys, admin passwords, fiscal tokens, certificates, or other private credentials in browser code. Vite exposes every `VITE_` variable to the final JavaScript bundle, so these values must be public by design.

Administrative operations that need elevated privileges should run in Supabase Edge Functions or another backend service where secrets stay server-side. The browser should rely on Supabase Auth plus Row Level Security policies.

After rotating or changing credentials, update the ignored local `.env.local` file and redeploy the app.
