/** @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as createCharge } from "@/app/api/admin/charges/route";
import { PATCH as patchPlayer } from "@/app/api/admin/players/[playerId]/route";
import { POST as createPlayer } from "@/app/api/admin/players/route";
import { GET as exportPayments } from "@/app/api/admin/reports/payments/route";
import type { SessionPayload } from "@/lib/auth/session";
import { MockClubStore, resetMockStore } from "@/lib/data/mock-store";
import { DEMO_ADMIN_PHONE, DEMO_PLAYER_PHONE } from "@/lib/data/seed";
import { AdminAccessError, requireAdmin } from "@/lib/admin/access";
import { CsrfError, assertSameOrigin } from "@/lib/csrf";
import { loadAdminOverview } from "@/lib/admin/dashboard";

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/data", () => ({
  getStore: () => new MockClubStore(),
}));

import { getSession } from "@/lib/session";

const mockedSession = vi.mocked(getSession);

function sessionFor(playerId: string, fullName: string, role: "player" | "admin"): SessionPayload {
  return { playerId, phoneE164: "+447700900000", fullName, role };
}

describe("administrator access", () => {
  beforeEach(() => {
    resetMockStore();
    mockedSession.mockReset();
  });

  it("rejects an unauthenticated caller", async () => {
    await expect(requireAdmin(null, new MockClubStore())).rejects.toMatchObject({ status: 401 });
  });

  it("rejects an ordinary player even if they claim admin in the session object", async () => {
    const store = new MockClubStore();
    const alex = await store.getPlayerByPhone(DEMO_PLAYER_PHONE);
    await expect(
      requireAdmin(sessionFor(alex!.id, alex!.fullName, "admin"), store),
    ).rejects.toBeInstanceOf(AdminAccessError);
    await expect(
      loadAdminOverview({ session: sessionFor(alex!.id, alex!.fullName, "player"), store }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("allows the seeded administrator", async () => {
    const store = new MockClubStore();
    const priya = await store.getPlayerByPhone(DEMO_ADMIN_PHONE);
    const admin = await requireAdmin(sessionFor(priya!.id, priya!.fullName, "admin"), store);
    expect(admin.role).toBe("admin");
    const overview = await loadAdminOverview({
      session: sessionFor(priya!.id, priya!.fullName, "admin"),
      store,
    });
    expect(overview.balances.length).toBeGreaterThan(0);
  });

  it("blocks player API access to create charges, create players, patch players and export reports", async () => {
    const store = new MockClubStore();
    const alex = await store.getPlayerByPhone(DEMO_PLAYER_PHONE);
    mockedSession.mockResolvedValue(sessionFor(alex!.id, alex!.fullName, "player"));

    const charge = await createCharge(
      new Request("http://127.0.0.1:38471/api/admin/charges", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://127.0.0.1:38471" },
        body: JSON.stringify({
          playerIds: [alex!.id],
          category: "fine",
          description: "Fake fine",
          amount: "5.00",
          dueOn: "2026-12-01",
        }),
      }),
    );
    expect(charge.status).toBe(403);

    const player = await createPlayer(
      new Request("http://127.0.0.1:38471/api/admin/players", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://127.0.0.1:38471" },
        body: JSON.stringify({
          fullName: "Self Promote",
          phone: "07700 900188",
          role: "admin",
        }),
      }),
    );
    expect(player.status).toBe(403);

    const patch = await patchPlayer(
      new Request(`http://127.0.0.1:38471/api/admin/players/${alex!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Origin: "http://127.0.0.1:38471" },
        body: JSON.stringify({ role: "admin" }),
      }),
      { params: Promise.resolve({ playerId: alex!.id }) },
    );
    expect(patch.status).toBe(403);
    expect((await store.getPlayerById(alex!.id))?.role).toBe("player");

    const report = await exportPayments(
      new Request("http://127.0.0.1:38471/api/admin/reports/payments"),
    );
    expect(report.status).toBe(403);
  });

  it("blocks cross-origin admin mutations", async () => {
    const store = new MockClubStore();
    const priya = await store.getPlayerByPhone(DEMO_ADMIN_PHONE);
    mockedSession.mockResolvedValue(sessionFor(priya!.id, priya!.fullName, "admin"));
    const response = await createCharge(
      new Request("http://127.0.0.1:38471/api/admin/charges", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "https://evil.example" },
        body: JSON.stringify({
          playerIds: [priya!.id],
          category: "fine",
          description: "CSRF attempt",
          amount: "5.00",
          dueOn: "2026-12-01",
        }),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("lets an administrator post a fee and records an audit event", async () => {
    const store = new MockClubStore();
    const priya = await store.getPlayerByPhone(DEMO_ADMIN_PHONE);
    const alex = await store.getPlayerByPhone(DEMO_PLAYER_PHONE);
    mockedSession.mockResolvedValue(sessionFor(priya!.id, priya!.fullName, "admin"));
    const response = await createCharge(
      new Request("http://127.0.0.1:38471/api/admin/charges", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://127.0.0.1:38471" },
        body: JSON.stringify({
          playerIds: [alex!.id],
          category: "training",
          description: "Training · November",
          amount: "10.00",
          dueOn: "2026-11-01",
        }),
      }),
    );
    expect(response.status).toBe(200);
    const events = await store.listAuditEvents();
    expect(events.some((event) => event.action === "create_charges")).toBe(true);
  });

  it("does not delete payments when a charge is voided", async () => {
    const store = new MockClubStore();
    const priya = await store.getPlayerByPhone(DEMO_ADMIN_PHONE);
    const alex = await store.getPlayerByPhone(DEMO_PLAYER_PHONE);
    const paid = (await store.listChargesForPlayer(alex!.id)).find((charge) => charge.status === "paid");
    const before = (await store.listPaymentsForPlayer(alex!.id)).length;
    await store.voidCharge({ actorId: priya!.id, chargeId: paid!.id });
    expect((await store.listPaymentsForPlayer(alex!.id)).length).toBe(before);
    expect((await store.listChargesForPlayer(alex!.id)).find((charge) => charge.id === paid!.id)?.status).toBe(
      "void",
    );
  });

  it("refuses to demote the last administrator", async () => {
    const store = new MockClubStore();
    const priya = await store.getPlayerByPhone(DEMO_ADMIN_PHONE);
    await expect(
      store.updatePlayer({ actorId: priya!.id, playerId: priya!.id, role: "player" }),
    ).rejects.toThrow(/last active administrator/i);
  });

  it("rejects a forged origin header", () => {
    expect(() =>
      assertSameOrigin(
        new Request("http://127.0.0.1:38471/api/admin/players", {
          headers: { Origin: "https://attacker.test" },
        }),
      ),
    ).toThrow(CsrfError);
  });
});
