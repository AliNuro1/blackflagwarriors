/** @vitest-environment node */
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { MockClubStore, resetMockStore } from "@/lib/data/mock-store";
import { DEMO_INACTIVE_PHONE, DEMO_PLAYER_PHONE } from "@/lib/data/seed";
import type { SessionPayload } from "@/lib/auth/session";
import {
  checkoutIdempotencyKey,
  describeReturnPage,
  PaymentAccessError,
  startPlayerCheckout,
} from "@/lib/payments/checkout";
import type { CheckoutSessionInput, CheckoutSessionResult, StripeGateway } from "@/lib/payments/stripe-gateway";
import { processSignedStripeWebhook, WebhookSignatureError } from "@/lib/payments/webhooks";

const WEBHOOK_SECRET = "whsec_test_black_flag_warriors";

class MemoryStripe implements StripeGateway {
  readonly sessions = new Map<
    string,
    CheckoutSessionResult & { playerId: string; idempotencyKey: string }
  >();
  private readonly byIdempotency = new Map<string, CheckoutSessionResult>();

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    const existing = this.byIdempotency.get(input.idempotencyKey);
    if (existing) return existing;
    const id = `cs_test_${randomUUID()}`;
    const result: CheckoutSessionResult & { playerId: string; idempotencyKey: string } = {
      id,
      url: `https://checkout.stripe.com/c/pay/${id}`,
      amountTotal: input.amountPence,
      status: "open",
      paymentStatus: "unpaid",
      paymentIntentId: null,
      playerId: input.playerId,
      idempotencyKey: input.idempotencyKey,
    };
    this.sessions.set(id, result);
    this.byIdempotency.set(input.idempotencyKey, result);
    return result;
  }

  async retrieveCheckoutSession(id: string): Promise<CheckoutSessionResult | null> {
    return this.sessions.get(id) ?? null;
  }

  constructEvent(rawBody: string, signature: string, secret: string): Stripe.Event {
    return Stripe.webhooks.constructEvent(rawBody, signature, secret);
  }

  expire(id: string): void {
    const session = this.sessions.get(id);
    if (session) session.status = "expired";
  }
}

function sessionFor(playerId: string, fullName = "Alex Reed"): SessionPayload {
  return { playerId, phoneE164: DEMO_PLAYER_PHONE, fullName, role: "player" };
}

function signedEvent(input: {
  type: string;
  sessionId: string;
  eventId?: string;
  amountTotal?: number;
  paymentStatus?: string;
  playerId?: string;
  paymentIntentId?: string | null;
}): { rawBody: string; signature: string } {
  const rawBody = JSON.stringify({
    id: input.eventId ?? `evt_${randomUUID()}`,
    object: "event",
    type: input.type,
    data: {
      object: {
        id: input.sessionId,
        object: "checkout.session",
        amount_total: input.amountTotal,
        payment_status: input.paymentStatus ?? "paid",
        payment_intent: input.paymentIntentId ?? "pi_test_confirmed",
        metadata: { playerId: input.playerId },
        status: "complete",
      },
    },
  });
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload: rawBody,
    secret: WEBHOOK_SECRET,
  });
  return { rawBody, signature };
}

async function startAlexCheckout(store: MockClubStore, stripe: MemoryStripe) {
  const player = await store.getPlayerByPhone(DEMO_PLAYER_PHONE);
  return startPlayerCheckout({
    session: sessionFor(player!.id),
    store,
    stripe,
  });
}

describe("Stripe Checkout", () => {
  beforeEach(() => {
    resetMockStore();
  });

  it("loads amount due from club records and ignores client amount, player ID and charge IDs", async () => {
    const store = new MockClubStore();
    const stripe = new MemoryStripe();
    const alex = await store.getPlayerByPhone(DEMO_PLAYER_PHONE);
    const jordan = await store.getPlayerByPhone("+447700900102");
    const jordanCharge = (await store.listChargesForPlayer(jordan!.id))[0]!;
    const expected = (await store.listChargesForPlayer(alex!.id))
      .filter((charge) => charge.payablePence > 0)
      .reduce((sum, charge) => sum + charge.payablePence, 0);

    const result = await startPlayerCheckout({
      session: sessionFor(alex!.id),
      store,
      stripe,
      clientBody: {
        amountPence: 1,
        playerId: jordan!.id,
        chargeIds: [jordanCharge.id],
      },
    });

    expect(result.amountPence).toBe(expected);
    expect(result.amountPence).toBeGreaterThan(1);
    const payment = await store.getPaymentByStripeSession(
      [...stripe.sessions.values()][0]!.id,
    );
    expect(payment?.playerId).toBe(alex!.id);
    expect(payment?.amountPence).toBe(expected);
    expect(payment?.allocations.some((row) => row.chargeId === jordanCharge.id)).toBe(false);
  });

  it("reuses an open Checkout Session instead of creating a duplicate payment", async () => {
    const store = new MockClubStore();
    const stripe = new MemoryStripe();
    const first = await startAlexCheckout(store, stripe);
    const second = await startAlexCheckout(store, stripe);
    expect(second.paymentId).toBe(first.paymentId);
    expect(second.url).toBe(first.url);
    expect(stripe.sessions.size).toBe(1);
    const payments = await store.listPaymentsForPlayer(
      (await store.getPlayerByPhone(DEMO_PLAYER_PHONE))!.id,
    );
    expect(payments.filter((payment) => payment.status === "pending")).toHaveLength(1);
    expect(
      checkoutIdempotencyKey(
        (await store.getPlayerByPhone(DEMO_PLAYER_PHONE))!.id,
        [],
        first.amountPence,
      ),
    ).toMatch(/^bfw_checkout_/);
  });

  it("rejects forged webhook signatures", async () => {
    const store = new MockClubStore();
    const stripe = new MemoryStripe();
    const checkout = await startAlexCheckout(store, stripe);
    const { rawBody } = signedEvent({
      type: "checkout.session.completed",
      sessionId: [...stripe.sessions.keys()][0]!,
      amountTotal: checkout.amountPence,
      playerId: (await store.getPlayerByPhone(DEMO_PLAYER_PHONE))!.id,
    });

    await expect(
      processSignedStripeWebhook({
        rawBody,
        signature: "t=1,v1=0000000000000000000000000000000000000000000000000000000000000000",
        webhookSecret: WEBHOOK_SECRET,
        stripe,
        store,
      }),
    ).rejects.toBeInstanceOf(WebhookSignatureError);

    const payment = await store.getPaymentByStripeSession([...stripe.sessions.keys()][0]!);
    expect(payment?.status).toBe("pending");
  });

  it("ignores duplicate webhook deliveries after a successful test-mode payment", async () => {
    const store = new MockClubStore();
    const stripe = new MemoryStripe();
    const checkout = await startAlexCheckout(store, stripe);
    const alex = await store.getPlayerByPhone(DEMO_PLAYER_PHONE);
    const sessionId = [...stripe.sessions.keys()][0]!;
    const event = signedEvent({
      type: "checkout.session.completed",
      sessionId,
      eventId: "evt_test_success_1",
      amountTotal: checkout.amountPence,
      playerId: alex!.id,
      paymentStatus: "paid",
    });

    const first = await processSignedStripeWebhook({
      ...event,
      webhookSecret: WEBHOOK_SECRET,
      stripe,
      store,
    });
    const second = await processSignedStripeWebhook({
      ...event,
      webhookSecret: WEBHOOK_SECRET,
      stripe,
      store,
    });

    expect(first).toEqual({ received: true, duplicate: false, applied: "succeeded" });
    expect(second).toEqual({ received: true, duplicate: true, applied: null });

    const payment = await store.getPaymentByStripeSession(sessionId);
    expect(payment?.status).toBe("succeeded");
    expect(payment?.stripePaymentIntentId).toBe("pi_test_confirmed");
    const remaining = (await store.listChargesForPlayer(alex!.id)).reduce(
      (sum, charge) => sum + charge.remainingPence,
      0,
    );
    expect(remaining).toBe(0);
    expect(describeReturnPage(payment).confirmed).toBe(true);
  });

  it("does not confirm when Stripe amount_total does not match club records", async () => {
    const store = new MockClubStore();
    const stripe = new MemoryStripe();
    const checkout = await startAlexCheckout(store, stripe);
    const alex = await store.getPlayerByPhone(DEMO_PLAYER_PHONE);
    const sessionId = [...stripe.sessions.keys()][0]!;
    const event = signedEvent({
      type: "checkout.session.completed",
      sessionId,
      amountTotal: checkout.amountPence - 1,
      playerId: alex!.id,
    });

    const result = await processSignedStripeWebhook({
      ...event,
      webhookSecret: WEBHOOK_SECRET,
      stripe,
      store,
    });
    expect(result.applied).toBe("amount_mismatch");
    expect((await store.getPaymentByStripeSession(sessionId))?.status).toBe("pending");
  });

  it("does not confirm when Checkout metadata names a different player", async () => {
    const store = new MockClubStore();
    const stripe = new MemoryStripe();
    const checkout = await startAlexCheckout(store, stripe);
    const jordan = await store.getPlayerByPhone("+447700900102");
    const sessionId = [...stripe.sessions.keys()][0]!;
    const event = signedEvent({
      type: "checkout.session.completed",
      sessionId,
      amountTotal: checkout.amountPence,
      playerId: jordan!.id,
    });

    const result = await processSignedStripeWebhook({
      ...event,
      webhookSecret: WEBHOOK_SECRET,
      stripe,
      store,
    });
    expect(result.applied).toBe("ownership_mismatch");
    expect((await store.getPaymentByStripeSession(sessionId))?.status).toBe("pending");
  });

  it("releases reserved charges when checkout expires and does not mark paid", async () => {
    const store = new MockClubStore();
    const stripe = new MemoryStripe();
    const checkout = await startAlexCheckout(store, stripe);
    const alex = await store.getPlayerByPhone(DEMO_PLAYER_PHONE);
    const sessionId = [...stripe.sessions.keys()][0]!;
    const reserved = (await store.listChargesForPlayer(alex!.id)).reduce(
      (sum, charge) => sum + charge.payablePence,
      0,
    );
    expect(reserved).toBe(0);

    const event = signedEvent({
      type: "checkout.session.expired",
      sessionId,
      amountTotal: checkout.amountPence,
      playerId: alex!.id,
      paymentStatus: "unpaid",
    });
    const result = await processSignedStripeWebhook({
      ...event,
      webhookSecret: WEBHOOK_SECRET,
      stripe,
      store,
    });
    expect(result.applied).toBe("expired");

    const payment = await store.getPaymentByStripeSession(sessionId);
    expect(payment?.status).toBe("expired");
    const payable = (await store.listChargesForPlayer(alex!.id)).reduce(
      (sum, charge) => sum + charge.payablePence,
      0,
    );
    expect(payable).toBe(checkout.amountPence);
    expect(describeReturnPage(payment).confirmed).toBe(false);
  });

  it("keeps async unpaid checkout pending until a paid event arrives", async () => {
    const store = new MockClubStore();
    const stripe = new MemoryStripe();
    const checkout = await startAlexCheckout(store, stripe);
    const alex = await store.getPlayerByPhone(DEMO_PLAYER_PHONE);
    const sessionId = [...stripe.sessions.keys()][0]!;
    const pending = await processSignedStripeWebhook({
      ...signedEvent({
        type: "checkout.session.completed",
        sessionId,
        eventId: "evt_async_pending",
        amountTotal: checkout.amountPence,
        playerId: alex!.id,
        paymentStatus: "unpaid",
      }),
      webhookSecret: WEBHOOK_SECRET,
      stripe,
      store,
    });
    expect(pending.applied).toBe("pending_async");
    expect((await store.getPaymentByStripeSession(sessionId))?.status).toBe("pending");

    const paid = await processSignedStripeWebhook({
      ...signedEvent({
        type: "checkout.session.async_payment_succeeded",
        sessionId,
        eventId: "evt_async_paid",
        amountTotal: checkout.amountPence,
        playerId: alex!.id,
        paymentStatus: "paid",
      }),
      webhookSecret: WEBHOOK_SECRET,
      stripe,
      store,
    });
    expect(paid.applied).toBe("succeeded");
    expect((await store.getPaymentByStripeSession(sessionId))?.status).toBe("succeeded");
  });

  it("does not treat the success or cancel return page as confirmation", () => {
    expect(describeReturnPage({ status: "pending" } as never).confirmed).toBe(false);
    expect(describeReturnPage({ status: "cancelled" } as never).confirmed).toBe(false);
    expect(describeReturnPage({ status: "expired" } as never).confirmed).toBe(false);
    expect(describeReturnPage({ status: "failed" } as never).confirmed).toBe(false);
    expect(describeReturnPage({ status: "succeeded" } as never).confirmed).toBe(true);
  });

  it("blocks creating a pending payment for another player's charges", async () => {
    const store = new MockClubStore();
    const alex = await store.getPlayerByPhone(DEMO_PLAYER_PHONE);
    const jordan = await store.getPlayerByPhone("+447700900102");
    const jordanCharge = (await store.listChargesForPlayer(jordan!.id))[0]!;
    await expect(
      store.createPendingPayment({
        playerId: alex!.id,
        chargeIds: [jordanCharge.id],
        amountPence: jordanCharge.payablePence,
        stripeCheckoutSessionId: "cs_test_steal",
      }),
    ).rejects.toThrow(/not payable/i);
  });

  it("requires a signed-in player to start checkout", async () => {
    await expect(
      startPlayerCheckout({
        session: null,
        store: new MockClubStore(),
        stripe: new MemoryStripe(),
      }),
    ).rejects.toBeInstanceOf(PaymentAccessError);
  });

  it("refuses checkout for an inactive player", async () => {
    const store = new MockClubStore();
    const robin = await store.getPlayerByPhone(DEMO_INACTIVE_PHONE);
    await expect(
      startPlayerCheckout({
        session: sessionFor(robin!.id, robin!.fullName),
        store,
        stripe: new MemoryStripe(),
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("rejects a webhook with a missing signature", async () => {
    await expect(
      processSignedStripeWebhook({
        rawBody: "{}",
        signature: null,
        webhookSecret: WEBHOOK_SECRET,
        stripe: new MemoryStripe(),
        store: new MockClubStore(),
      }),
    ).rejects.toBeInstanceOf(WebhookSignatureError);
  });
});
