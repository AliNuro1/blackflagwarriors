# Black Flag Warriors — player payments

Private portal for an amateur Sunday team in Manchester. Players sign in with a UK mobile one-time code, see fees in pence, and pay by card. Admins post charges. The database enforces who can read or change records.

## Stack

- Next.js App Router, TypeScript (strict)
- Supabase PostgreSQL with Row Level Security
- Twilio Verify (SMS OTP)
- Stripe Checkout
- Tailwind CSS

Without live keys the app runs against an in-memory fictional squad (Ofcom drama-range numbers only).

## Run locally

```bash
bun install
cp .env.example .env.local
bun run dev -- --hostname 0.0.0.0 --port 38471
```

Preview logins when Twilio is unset: player `07700 900 101`, admin `07700 900 110`, code `000000`.

## Database

Schema lives in `supabase/migrations/`. Seed data is fictional and is in `supabase/seed.sql`.

### Apply migrations to a development Supabase project

1. Create a project at [supabase.com](https://supabase.com) (or run the CLI locally).
2. Install the CLI: `npm install -g supabase` (or use `npx supabase`).
3. From this repo:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

`db push` applies every file in `supabase/migrations/` in timestamp order.

4. Load development data (optional, fictional only):

```bash
supabase db query --linked -f supabase/seed.sql
```

If you prefer the dashboard: open **SQL Editor**, paste `supabase/migrations/20261014180000_club_payments.sql`, run it, then paste and run `supabase/seed.sql`.

5. Put **server-only** values in `.env.local`:

```
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

Never add `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`. The service role bypasses RLS and must stay on the server. This app talks to Supabase only from Route Handlers and server components.

Local Postgres without Supabase: apply `supabase/tests/bootstrap.sql` first (creates `anon` / `authenticated` / `service_role` and `auth.uid()` stubs), then the migration, then the seed. Do **not** run the bootstrap file on hosted Supabase.

### What the schema enforces

| Table | Purpose |
| --- | --- |
| `profiles` | User ID, name, registered E.164 phone, role (`player` / `admin`), timestamps |
| `charges` | Player, description, category, amount in pence, due date, status |
| `payments` | Player, amount in pence, `gbp`, Stripe Checkout Session ID, Payment Intent ID, status |
| `payment_allocations` | Links a payment to the charges it settles (partials and multi-charge checkouts) |
| `stripe_webhook_events` | Unique Stripe event ID so webhooks are processed once |

Roles are stored on `profiles.role`. Players cannot update that column: there is no UPDATE policy for non-admins. Fee amounts and payment status are not writable by players.

RLS is **enabled and forced** on every application table. Players may `SELECT` only their own profile, charges, payments, and allocations. `anon` has no table grants. Webhook events have no client policies. Charges are inserted through `create_charges_for_players`; checkouts and settlement go through `begin_checkout`, `complete_payment`, and `ingest_stripe_event` so multiple rows change in one transaction.

## Tests

```bash
bun run test:run
```

That includes phone helpers, the in-memory store, and Postgres RLS checks (PGlite). Policy tests live in `src/test/rls-policies.test.ts`.

## Stripe webhook

Point Stripe at `/api/webhooks/stripe`. The handler verifies the signature, inserts `stripe_event_id` (duplicate events are ignored), then reconciles the Checkout Session inside the same database function.
