import type Stripe from "stripe";
import type { ClubStore, Payment } from "@/lib/data/types";
import type { StripeGateway } from "@/lib/payments/stripe-gateway";

export class WebhookSignatureError extends Error {
  constructor(message = "Invalid Stripe signature") {
    super(message);
    this.name = "WebhookSignatureError";
  }
}

function sessionFromEvent(event: Stripe.Event): {
  sessionId: string | null;
  paymentIntentId: string | null;
  paymentStatus: string | null;
  amountTotal: number | null;
  metadataPlayerId: string | null;
} {
  const object = event.data.object as {
    id?: string;
    object?: string;
    payment_intent?: string | { id: string } | null;
    payment_status?: string;
    amount_total?: number;
    amount?: number;
    metadata?: { playerId?: string };
  };
  const paymentIntentId =
    typeof object.payment_intent === "string"
      ? object.payment_intent
      : (object.payment_intent?.id ?? null);
  const sessionId = object.object === "checkout.session" ? (object.id ?? null) : null;
  return {
    sessionId,
    paymentIntentId,
    paymentStatus: object.payment_status ?? null,
    amountTotal: object.amount_total ?? object.amount ?? null,
    metadataPlayerId: object.metadata?.playerId ?? null,
  };
}

function logWebhook(event: string, fields: Record<string, string | number | boolean | null | undefined>): void {
  console.info(`[payments] ${event}`, fields);
}

export async function processSignedStripeWebhook(input: {
  rawBody: string;
  signature: string | null;
  webhookSecret: string;
  stripe: StripeGateway;
  store: ClubStore;
}): Promise<{ received: true; duplicate: boolean; applied: string | null }> {
  if (!input.signature) {
    throw new WebhookSignatureError("Missing Stripe signature");
  }

  let event: Stripe.Event;
  try {
    event = input.stripe.constructEvent(input.rawBody, input.signature, input.webhookSecret);
  } catch {
    throw new WebhookSignatureError();
  }

  const refs = sessionFromEvent(event);
  const inserted = await input.store.ingestStripeEvent({
    stripeEventId: event.id,
    eventType: event.type,
    payload: { id: event.id, type: event.type },
    stripeCheckoutSessionId: refs.sessionId,
    stripePaymentIntentId: refs.paymentIntentId,
    apply: false,
  });

  if (!inserted) {
    logWebhook("webhook_duplicate", { eventId: event.id, type: event.type });
    return { received: true, duplicate: true, applied: null };
  }

  const applied = await applyStripeEvent(input.store, event, refs);
  logWebhook("webhook_applied", {
    eventId: event.id,
    type: event.type,
    applied,
    sessionId: refs.sessionId,
  });
  return { received: true, duplicate: false, applied };
}

async function applyStripeEvent(
  store: ClubStore,
  event: Stripe.Event,
  refs: ReturnType<typeof sessionFromEvent>,
): Promise<string | null> {
  const sessionId = refs.sessionId;
  if (!sessionId) return null;

  const payment = await store.getPaymentByStripeSession(sessionId);
  if (!payment) {
    logWebhook("webhook_unknown_session", { sessionId, type: event.type });
    return "unknown_session";
  }

  if (refs.metadataPlayerId && refs.metadataPlayerId !== payment.playerId) {
    logWebhook("webhook_ownership_mismatch", {
      sessionId,
      paymentPlayer: payment.playerId,
    });
    return "ownership_mismatch";
  }

  if (event.type === "checkout.session.completed") {
    if (refs.paymentStatus && refs.paymentStatus !== "paid") {
      logWebhook("webhook_async_pending", { sessionId, paymentStatus: refs.paymentStatus });
      return "pending_async";
    }
    if (refs.amountTotal !== null && refs.amountTotal !== payment.amountPence) {
      logWebhook("webhook_amount_mismatch", {
        sessionId,
        expected: payment.amountPence,
        stripeTotal: refs.amountTotal,
      });
      return "amount_mismatch";
    }
    const updated = await store.completePayment({
      stripeCheckoutSessionId: sessionId,
      stripePaymentIntentId: refs.paymentIntentId ?? undefined,
    });
    return updated?.status === "succeeded" ? "succeeded" : "not_pending";
  }

  if (event.type === "checkout.session.async_payment_succeeded") {
    if (refs.amountTotal !== null && refs.amountTotal !== payment.amountPence) {
      logWebhook("webhook_amount_mismatch", {
        sessionId,
        expected: payment.amountPence,
        stripeTotal: refs.amountTotal,
      });
      return "amount_mismatch";
    }
    const updated = await store.completePayment({
      stripeCheckoutSessionId: sessionId,
      stripePaymentIntentId: refs.paymentIntentId ?? undefined,
    });
    return updated?.status === "succeeded" ? "succeeded" : "not_pending";
  }

  if (event.type === "checkout.session.async_payment_failed") {
    await store.abandonPayment({ stripeCheckoutSessionId: sessionId, status: "failed" });
    return "failed";
  }

  if (event.type === "checkout.session.expired") {
    await store.abandonPayment({ stripeCheckoutSessionId: sessionId, status: "expired" });
    return "expired";
  }

  return "ignored";
}

export function paymentStillOpen(payment: Payment | null): boolean {
  return payment?.status === "pending";
}
