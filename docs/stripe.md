# Stripe Checkout (test mode first)

Black Flag Warriors takes card payments with **Stripe Checkout**. The browser never chooses the amount, player, or charges. The server loads the signed-in player’s open and part-paid fees from the database, totals remaining **integer pence**, and creates a Checkout Session in **GBP**.

This app does **not** collect or store card numbers or CVCs. Cards are entered only on Stripe-hosted Checkout.

Payments are **not live** until:

1. Real Stripe credentials are in the server environment (not `NEXT_PUBLIC_*`).
2. The webhook endpoint is registered, the signing secret is set, and a test (then live) event has been delivered and processed.

Until then, treat every charge as **test mode** even if a `sk_live_` key is present.

## Dashboard setup (test mode)

1. Open [Stripe Dashboard](https://dashboard.stripe.com) and switch the toggle to **Test mode**.
2. Developers → API keys. Copy the **Secret key** (`sk_test_…`). Put it in `.env.local` as `STRIPE_SECRET_KEY`. Never prefix it with `NEXT_PUBLIC_`.
3. Developers → Webhooks → **Add endpoint**.
   - Endpoint URL: `https://YOUR_PUBLIC_ORIGIN/api/webhooks/stripe`
   - For local development use the [Stripe CLI](https://stripe.com/docs/stripe-cli):

     ```bash
     stripe listen --forward-to localhost:38471/api/webhooks/stripe
     ```

     The CLI prints a webhook signing secret (`whsec_…`).
4. Subscribe at least to:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
5. Copy the endpoint **Signing secret** into `STRIPE_WEBHOOK_SECRET`. Never expose it as `NEXT_PUBLIC_*`.
6. Set `NEXT_PUBLIC_APP_URL` to the same origin players use (success and cancel URLs are built from it).
7. Restart the app. The banner should say **Stripe test mode**, not that payments are live.

Test cards: use Stripe’s documented test PANs (for example `ACCT-000015`) on Checkout. Do not put those numbers in this codebase or in logs.

## What the server does

- `POST /api/pay` (authenticated) ignores any amount, player ID, or charge IDs in the body. It totals payable pence from trusted rows and creates (or reuses) a Checkout Session with `currency: gbp` and `unit_amount` in pence.
- A pending `payments` row plus `payment_allocations` reserves those pence so a second checkout cannot over-allocate.
- Stripe idempotency keys are derived from player, charge IDs, and amount. An open Session is reused instead of opening a second one.
- `POST /api/webhooks/stripe` reads the **raw body**, verifies `Stripe-Signature` with the official SDK (`constructEvent`), inserts `stripe_event_id` uniquely, then applies the event.
- A payment is **succeeded** only after a signed `checkout.session.completed` (with `payment_status=paid`) or `checkout.session.async_payment_succeeded` whose `amount_total` matches club pence and whose metadata player matches the payment row.
- Expired, cancelled, and failed sessions call `abandon_payment`, which frees reserved allocations. Unpaid async completions stay pending.
- `/pay/success` and `/pay/cancel` only display status. They never mark a payment paid.

Logs include player id, payment id, session id, amounts in pence, and event type. They must not include secret keys, raw card numbers, or CVCs.

## Going live later

1. Complete test-mode webhook delivery (including a successful `checkout.session.completed`).
2. Create a live webhook endpoint on the production origin with the same events.
3. Replace `STRIPE_SECRET_KEY` with `sk_live_…` and `STRIPE_WEBHOOK_SECRET` with the **live** endpoint secret.
4. Confirm a live webhook is received (Dashboard → Webhooks → deliveries) before telling players that card payments are live.
