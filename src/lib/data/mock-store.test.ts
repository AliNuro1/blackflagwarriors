import { DEMO_PLAYER_PHONE } from "./seed";
import { MockClubStore, resetMockStore } from "./mock-store";

describe("mock club store", () => {
  beforeEach(() => {
    resetMockStore();
  });

  it("records Stripe events once", async () => {
    const store = new MockClubStore();
    const player = await store.getPlayerByPhone(DEMO_PLAYER_PHONE);
    const open = (await store.listChargesForPlayer(player!.id)).filter(
      (charge) => charge.status === "open",
    );
    const payment = await store.createPendingPayment({
      playerId: player!.id,
      chargeIds: [open[0]!.id],
      amountPence: open[0]!.remainingPence,
      stripeCheckoutSessionId: "cs_test_once",
    });

    const first = await store.ingestStripeEvent({
      stripeEventId: "evt_1",
      eventType: "checkout.session.completed",
      payload: {},
      stripeCheckoutSessionId: payment.stripeCheckoutSessionId,
    });
    const second = await store.ingestStripeEvent({
      stripeEventId: "evt_1",
      eventType: "checkout.session.completed",
      payload: {},
      stripeCheckoutSessionId: payment.stripeCheckoutSessionId,
    });

    expect(first).toBe(true);
    expect(second).toBe(false);

    const stillPending = await store.getPaymentByStripeSession("cs_test_once");
    expect(stillPending?.status).toBe("pending");
  });
});
