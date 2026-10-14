import Stripe from "stripe";
import { getEnv } from "@/lib/env";

export interface CheckoutSessionInput {
  playerId: string;
  chargeIds: string[];
  amountPence: number;
  lineItems: { description: string; amountPence: number }[];
  successUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
}

export interface CheckoutSessionResult {
  id: string;
  url: string;
  amountTotal: number;
  status: string;
  paymentStatus: string;
  paymentIntentId: string | null;
}

export interface StripeGateway {
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;
  retrieveCheckoutSession(id: string): Promise<CheckoutSessionResult | null>;
  constructEvent(rawBody: string, signature: string, secret: string): Stripe.Event;
}

function intentId(value: string | Stripe.PaymentIntent | null): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function mapSession(session: Stripe.Checkout.Session): CheckoutSessionResult {
  if (!session.url && session.status === "open") {
    throw new Error("Stripe Checkout Session is missing a URL");
  }
  return {
    id: session.id,
    url: session.url ?? "",
    amountTotal: session.amount_total ?? 0,
    status: session.status ?? "open",
    paymentStatus: session.payment_status,
    paymentIntentId: intentId(session.payment_intent),
  };
}

export function stripeMode(secret = process.env.STRIPE_SECRET_KEY ?? ""): "test" | "live" | "unset" {
  if (!secret) return "unset";
  if (secret.startsWith("sk_live_")) return "live";
  return "test";
}

export function createStripeGateway(): StripeGateway {
  if (process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY must never be exposed as NEXT_PUBLIC_*.");
  }
  const env = getEnv();
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);

  return {
    async createCheckoutSession(input) {
      const lineTotal = input.lineItems.reduce((sum, item) => sum + item.amountPence, 0);
      if (!Number.isInteger(input.amountPence) || input.amountPence !== lineTotal) {
        throw new Error("Checkout amount must be integer pence matching line items");
      }
      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          currency: "gbp",
          client_reference_id: input.playerId,
          metadata: {
            playerId: input.playerId,
            chargeIds: input.chargeIds.join(","),
            amountPence: String(input.amountPence),
          },
          payment_intent_data: {
            metadata: {
              playerId: input.playerId,
              chargeIds: input.chargeIds.join(","),
            },
          },
          line_items: input.lineItems.map((item) => ({
            quantity: 1,
            price_data: {
              currency: "gbp",
              unit_amount: item.amountPence,
              product_data: {
                name: item.description.slice(0, 120),
                description: "Black Flag Warriors player fees",
              },
            },
          })),
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
        },
        { idempotencyKey: input.idempotencyKey },
      );
      return mapSession(session);
    },
    async retrieveCheckoutSession(id) {
      const session = await stripe.checkout.sessions.retrieve(id);
      return mapSession(session);
    },
    constructEvent(rawBody, signature, secret) {
      return stripe.webhooks.constructEvent(rawBody, signature, secret);
    },
  };
}
