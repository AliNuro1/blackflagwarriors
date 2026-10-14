import { createHash } from "node:crypto";
import type { SessionPayload } from "@/lib/auth/session";
import { appUrl } from "@/lib/env";
import type { ClubStore, Payment } from "@/lib/data/types";
import type { StripeGateway } from "@/lib/payments/stripe-gateway";

export class PaymentAccessError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "PaymentAccessError";
  }
}

export function checkoutIdempotencyKey(playerId: string, chargeIds: string[], amountPence: number): string {
  const material = `${playerId}:${[...chargeIds].sort().join(",")}:${amountPence}`;
  const digest = createHash("sha256").update(material).digest("hex").slice(0, 24);
  return `bfw_checkout_${digest}`;
}

function logPayment(event: string, fields: Record<string, string | number | null | undefined>): void {
  const safe = { ...fields };
  delete safe.secret;
  delete safe.card;
  delete safe.cvc;
  console.info(`[payments] ${event}`, safe);
}

export async function startPlayerCheckout(input: {
  session: SessionPayload | null;
  store: ClubStore;
  stripe: StripeGateway;
  clientBody?: unknown;
}): Promise<{ url: string; paymentId: string; amountPence: number; testMode: boolean }> {
  if (!input.session) {
    throw new PaymentAccessError(401, "Sign in to pay.");
  }
  if (input.clientBody && typeof input.clientBody === "object") {
    const body = input.clientBody as Record<string, unknown>;
    if ("amountPence" in body || "playerId" in body || "chargeIds" in body) {
      logPayment("ignored_client_payment_fields", { playerId: input.session.playerId });
    }
  }

  const player = await input.store.getPlayerById(input.session.playerId);
  if (!player || player.status !== "active") {
    throw new PaymentAccessError(403, "Your account cannot take payments.");
  }

  const pending = (await input.store.listPaymentsForPlayer(player.id)).find(
    (payment) => payment.status === "pending" && payment.stripeCheckoutSessionId,
  );
  if (pending?.stripeCheckoutSessionId) {
    try {
      const existing = await input.stripe.retrieveCheckoutSession(pending.stripeCheckoutSessionId);
      if (existing && existing.status === "open" && existing.url) {
        logPayment("checkout_reused", {
          playerId: player.id,
          paymentId: pending.id,
          sessionId: existing.id,
          amountPence: pending.amountPence,
        });
        return {
          url: existing.url,
          paymentId: pending.id,
          amountPence: pending.amountPence,
          testMode: true,
        };
      }
      if (existing && existing.status === "complete") {
        logPayment("checkout_waiting_webhook", {
          playerId: player.id,
          paymentId: pending.id,
          sessionId: existing.id,
        });
        throw new PaymentAccessError(
          409,
          "This payment is waiting for Stripe to confirm. It is not marked paid from this page.",
        );
      }
      if (existing && existing.status !== "open") {
        await input.store.abandonPayment({
          paymentId: pending.id,
          status: existing.status === "expired" ? "expired" : "cancelled",
        });
      }
    } catch (error) {
      if (error instanceof PaymentAccessError) throw error;
      logPayment("checkout_retrieve_failed", { playerId: player.id, paymentId: pending.id });
      throw new PaymentAccessError(502, "Could not resume the existing Stripe checkout.");
    }
  }

  const charges = (await input.store.listChargesForPlayer(player.id)).filter(
    (charge) =>
      charge.playerId === player.id &&
      (charge.status === "open" || charge.status === "partial") &&
      charge.payablePence > 0,
  );
  if (charges.some((charge) => charge.playerId !== player.id)) {
    throw new PaymentAccessError(403, "Those charges are not yours.");
  }
  const amountPence = charges.reduce((sum, charge) => sum + charge.payablePence, 0);
  if (!Number.isInteger(amountPence) || amountPence <= 0 || charges.length === 0) {
    throw new PaymentAccessError(400, "There is nothing outstanding on your account.");
  }

  const chargeIds = charges.map((charge) => charge.id);
  const idempotencyKey = checkoutIdempotencyKey(player.id, chargeIds, amountPence);
  const session = await input.stripe.createCheckoutSession({
    playerId: player.id,
    chargeIds,
    amountPence,
    lineItems: charges.map((charge) => ({
      description: charge.description,
      amountPence: charge.payablePence,
    })),
    successUrl: `${appUrl()}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${appUrl()}/pay/cancel`,
    idempotencyKey,
  });

  if (session.amountTotal !== amountPence) {
    logPayment("checkout_amount_mismatch", {
      playerId: player.id,
      expected: amountPence,
      stripeTotal: session.amountTotal,
    });
    throw new PaymentAccessError(502, "Stripe amount did not match club records.");
  }

  const payment = await input.store.createPendingPayment({
    playerId: player.id,
    chargeIds,
    amountPence,
    stripeCheckoutSessionId: session.id,
  });

  logPayment("checkout_created", {
    playerId: player.id,
    paymentId: payment.id,
    sessionId: session.id,
    amountPence: payment.amountPence,
    chargeCount: chargeIds.length,
  });

  return {
    url: session.url,
    paymentId: payment.id,
    amountPence: payment.amountPence,
    testMode: true,
  };
}

export function describeReturnPage(payment: Payment | null): {
  confirmed: boolean;
  title: string;
  body: string;
} {
  if (payment?.status === "succeeded") {
    return {
      confirmed: true,
      title: "Payment confirmed",
      body: "Stripe has confirmed this payment. It is recorded against your fees.",
    };
  }
  return {
    confirmed: false,
    title: "Waiting for confirmation",
    body: "This page does not mark fees as paid. We wait for a signed Stripe webhook before confirming.",
  };
}
