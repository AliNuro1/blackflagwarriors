import { getStore } from "@/lib/data";
import { getEnv } from "@/lib/env";
import { jsonError, jsonOk } from "@/lib/http";
import { stripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const env = getEnv();
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return jsonError("Stripe webhook secret is not configured.", 503);
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return jsonError("Missing Stripe signature.", 400);

  const raw = await request.text();
  try {
    const event = stripeClient().webhooks.constructEvent(
      raw,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );

    let checkoutSessionId: string | null = null;
    let paymentIntentId: string | null = null;
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      checkoutSessionId = session.id;
      paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent?.id ?? null);
    }

    await getStore().ingestStripeEvent({
      stripeEventId: event.id,
      eventType: event.type,
      payload: event,
      stripeCheckoutSessionId: checkoutSessionId,
      stripePaymentIntentId: paymentIntentId,
    });
  } catch (error) {
    console.error("Stripe webhook failed", error);
    return jsonError("Invalid webhook signature.", 400);
  }

  return jsonOk({ received: true });
}
