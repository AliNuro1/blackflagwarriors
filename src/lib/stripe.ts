import Stripe from "stripe";
import { appUrl, getEnv, usesMockPayments } from "@/lib/env";
import type { Charge, Player } from "@/lib/data/types";
import { getStore } from "@/lib/data";

export function stripeClient(): Stripe {
  const env = getEnv();
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(env.STRIPE_SECRET_KEY);
}

export async function startCheckout(player: Player, charges: Charge[]): Promise<string> {
  const store = getStore();
  const amountPence = charges.reduce((sum, charge) => sum + charge.remainingPence, 0);
  const chargeIds = charges.map((charge) => charge.id);

  if (usesMockPayments()) {
    const payment = await store.createPendingPayment({
      playerId: player.id,
      chargeIds,
      amountPence,
      stripeCheckoutSessionId: null,
    });
    const url = new URL("/pay/success", appUrl());
    url.searchParams.set("mock", "1");
    url.searchParams.set("payment_id", payment.id);
    return url.toString();
  }

  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: undefined,
    client_reference_id: player.id,
    metadata: {
      playerId: player.id,
      chargeIds: chargeIds.join(","),
    },
    line_items: charges.map((charge) => ({
      quantity: 1,
      price_data: {
        currency: "gbp",
        unit_amount: charge.remainingPence,
        product_data: {
          name: charge.description,
          description: "Black Flag Warriors player fees",
        },
      },
    })),
    success_url: `${appUrl()}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/pay/cancel`,
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  await store.createPendingPayment({
    playerId: player.id,
    chargeIds,
    amountPence,
    stripeCheckoutSessionId: session.id,
  });

  return session.url;
}

export async function fulfillStripeSession(sessionId: string): Promise<void> {
  const store = getStore();
  await store.completePayment({ stripeCheckoutSessionId: sessionId });
}
