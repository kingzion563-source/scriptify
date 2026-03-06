# Scriptify

## Environment Setup

Copy `apps/api/.env.example` to `apps/api/.env` and `apps/web/.env.example` to `apps/web/.env`, then fill in the values.

### API (`apps/api/.env`)

| Variable | Description | Where to get it |
|----------|-------------|------------------|
| `PORT` | Port the API server listens on. | Use `4000` for local dev or your host’s port. |
| `WEB_ORIGIN` | Allowed CORS origin for the frontend. | Use `http://localhost:3000` locally or your site URL in production. |
| `DATABASE_URL` | PostgreSQL connection string for Prisma. | From your Supabase project: Settings → Database → Connection string (URI). |
| `JWT_SECRET` | Secret used to sign and verify JWT access tokens. | Generate a random string (e.g. `openssl rand -hex 32`); must be at least 32 characters. |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST API base URL. | Upstash dashboard: create a Redis database → REST API URL. |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST API token. | Upstash dashboard: same database → REST API token. |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key for server-side verification. | Cloudflare Turnstile: create a site → Secret key. |
| `MEILISEARCH_HOST` | Meilisearch server URL for search. | Your Meilisearch instance (e.g. `http://localhost:7700` or Meilisearch Cloud). |
| `MEILISEARCH_API_KEY` | Meilisearch API key (optional if local dev has no key). | Meilisearch: Settings → API keys, or leave empty for local. |
| `SUPABASE_URL` | Supabase project URL. | Supabase dashboard: Project Settings → API → Project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only, bypasses RLS). | Supabase dashboard: Project Settings → API → service_role key. |
| `SUPABASE_ANON_KEY` | Supabase anonymous (public) key. | Supabase dashboard: Project Settings → API → anon public key. |
| `RESEND_API_KEY` | Resend API key for sending verification and other emails. | Resend dashboard: API Keys → Create. |
| `STRIPE_SECRET_KEY` | Stripe secret key for payments and subscriptions. | Stripe dashboard: Developers → API keys → Secret key (use test key for dev). |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret for `/api/v1/payments/webhook`. | Stripe dashboard: Developers → Webhooks → add endpoint → Signing secret. |
| `REDIS_URL` | Redis connection URL for BullMQ (background jobs). | Your Redis instance (e.g. `redis://localhost:6379` or Upstash Redis URL). |
| `SENTRY_DSN` | Sentry DSN for API error reporting. | Sentry project: Settings → Client keys (DSN). |

### Web (`apps/web/.env`)

| Variable | Description | Where to get it |
|----------|-------------|------------------|
| `NEXT_PUBLIC_API_URL` | Base URL of the Scriptify API used by the frontend. | Use `http://localhost:4000` locally or your API URL in production. |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL (used for SEO, OG, sitemap). | Use `http://localhost:3000` locally or your production domain. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key for the widget. | Cloudflare Turnstile: same site as API secret → Site key. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (exposed to the browser for Realtime). | Same as `SUPABASE_URL` in the API. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (exposed to the browser for Realtime). | Same as `SUPABASE_ANON_KEY` in the API. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key for client-side Stripe.js / checkout. | Stripe dashboard: Developers → API keys → Publishable key (use test key for dev). |
