/** @vitest-environment node */
import { DashboardAccessError, loadPlayerDashboard } from "./dashboard";
import { MockClubStore, resetMockStore } from "./data/mock-store";
import { DEMO_ADMIN_PHONE, DEMO_PLAYER_PHONE } from "./data/seed";
import type { SessionPayload } from "./auth/session";

function sessionFor(playerId: string, fullName: string, role: "player" | "admin" = "player"): SessionPayload {
  return { playerId, phoneE164: "+447700900000", fullName, role };
}

describe("player dashboard", () => {
  beforeEach(() => {
    resetMockStore();
  });

  it("rejects unauthenticated access", async () => {
    await expect(
      loadPlayerDashboard({ session: null, store: new MockClubStore() }),
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("rejects asking for another player's dashboard", async () => {
    const store = new MockClubStore();
    const alex = await store.getPlayerByPhone(DEMO_PLAYER_PHONE);
    const jordan = await store.getPlayerByPhone("+447700900102");
    await expect(
      loadPlayerDashboard({
        session: sessionFor(alex!.id, alex!.fullName),
        store,
        requestedPlayerId: jordan!.id,
      }),
    ).rejects.toBeInstanceOf(DashboardAccessError);
  });

  it("does not include other players' names, charges or payments", async () => {
    const store = new MockClubStore();
    const alex = await store.getPlayerByPhone(DEMO_PLAYER_PHONE);
    const jordan = await store.getPlayerByPhone("+447700900102");
    const dashboard = await loadPlayerDashboard({
      session: sessionFor(alex!.id, alex!.fullName),
      store,
    });
    const blob = JSON.stringify(dashboard);
    expect(dashboard.player.fullName).toBe("Alex Reed");
    expect(blob).not.toContain("Jordan Blake");
    expect(blob).not.toContain(jordan!.id);
    expect(blob).not.toContain(jordan!.phoneE164);
    expect(dashboard.charges.every((charge) => !charge.description.includes("Jordan"))).toBe(true);
  });

  it("shows a zero outstanding balance and empty payable set", async () => {
    const store = new MockClubStore();
    const priya = await store.getPlayerByPhone(DEMO_ADMIN_PHONE);
    const dashboard = await loadPlayerDashboard({
      session: sessionFor(priya!.id, priya!.fullName, "admin"),
      store,
    });
    expect(dashboard.outstandingPence).toBe(0);
    expect(dashboard.charges.every((charge) => charge.status === "paid")).toBe(true);
  });

  it("shows a player with no charges at all", async () => {
    const store = new MockClubStore();
    const drew = await store.getPlayerByPhone("+447700900111");
    const dashboard = await loadPlayerDashboard({
      session: sessionFor(drew!.id, drew!.fullName),
      store,
    });
    expect(dashboard.charges).toEqual([]);
    expect(dashboard.outstandingPence).toBe(0);
    expect(dashboard.payments).toEqual([]);
  });

  it("calculates a partial payment remaining in pence", async () => {
    const store = new MockClubStore();
    const alex = await store.getPlayerByPhone(DEMO_PLAYER_PHONE);
    const dashboard = await loadPlayerDashboard({
      session: sessionFor(alex!.id, alex!.fullName),
      store,
    });
    const league = dashboard.charges.find((charge) => charge.description.includes("League"));
    expect(league?.status).toBe("partial");
    expect(league?.amountPence).toBe(4000);
    expect(league?.remainingPence).toBe(2500);
    expect(league?.settledPence).toBe(1500);
    expect(dashboard.outstandingPence).toBe(
      dashboard.charges
        .filter((charge) => charge.status === "outstanding" || charge.status === "partial")
        .reduce((sum, charge) => sum + charge.remainingPence, 0),
    );
  });

  it("exposes confirmed payment status and receipt links only when succeeded", async () => {
    const store = new MockClubStore();
    const alex = await store.getPlayerByPhone(DEMO_PLAYER_PHONE);
    const dashboard = await loadPlayerDashboard({
      session: sessionFor(alex!.id, alex!.fullName),
      store,
    });
    expect(dashboard.payments.length).toBeGreaterThan(0);
    expect(dashboard.payments.every((payment) => payment.status === "succeeded")).toBe(true);
    expect(dashboard.payments.every((payment) => payment.receiptHref?.startsWith("/account/receipts/"))).toBe(
      true,
    );
  });
});
