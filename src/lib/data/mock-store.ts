import { randomUUID } from "node:crypto";
import { seedCharges, seedPlayers } from "./seed";
import type { Charge, ClubStore, Payment, Player, PlayerBalance } from "./types";

interface Memory {
  players: Player[];
  charges: Charge[];
  payments: Payment[];
  stripeEvents: Set<string>;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function refreshCharge(charge: Charge, payments: Payment[]): Charge {
  if (charge.status === "void") return charge;
  const settled = payments
    .filter((payment) => payment.status === "succeeded")
    .flatMap((payment) => payment.allocations)
    .filter((allocation) => allocation.chargeId === charge.id)
    .reduce((sum, allocation) => sum + allocation.amountPence, 0);
  const remaining = Math.max(charge.amountPence - settled, 0);
  const status = settled <= 0 ? "open" : settled < charge.amountPence ? "partial" : "paid";
  return { ...charge, remainingPence: remaining, status };
}

function createMemory(): Memory {
  const charges = seedCharges.map((charge) => ({ ...charge }));
  const payments: Payment[] = [];
  const training = charges.find((charge) => charge.id.endsWith("204"));
  const kit = charges.find((charge) => charge.id.endsWith("205"));
  const league = charges.find((charge) => charge.id.endsWith("203"));
  const adminMatch = charges.find((charge) => charge.id.endsWith("208"));

  function paid(
    id: string,
    charge: Charge,
    session: string,
    intent: string,
    at: string,
  ): Payment {
    return {
      id,
      playerId: charge.playerId,
      amountPence: charge.amountPence,
      currency: "gbp",
      stripeCheckoutSessionId: session,
      stripePaymentIntentId: intent,
      status: "succeeded",
      createdAt: at,
      updatedAt: at,
      allocations: [
        { chargeId: charge.id, amountPence: charge.amountPence, description: charge.description },
      ],
    };
  }

  if (training) {
    payments.push(
      paid(
        "33333333-3333-4333-8333-333333333301",
        training,
        "cs_test_training_october",
        "pi_test_training_october",
        "2026-10-01T18:12:00.000Z",
      ),
    );
  }
  if (kit) {
    payments.push(
      paid(
        "33333333-3333-4333-8333-333333333302",
        kit,
        "cs_test_kit_deposit",
        "pi_test_kit_deposit",
        "2026-08-12T11:04:00.000Z",
      ),
    );
  }
  if (league) {
    payments.push({
      id: "33333333-3333-4333-8333-333333333304",
      playerId: league.playerId,
      amountPence: 1500,
      currency: "gbp",
      stripeCheckoutSessionId: "cs_test_league_partial",
      stripePaymentIntentId: "pi_test_league_partial",
      status: "succeeded",
      createdAt: "2026-09-15T12:00:00.000Z",
      updatedAt: "2026-09-15T12:00:00.000Z",
      allocations: [
        {
          chargeId: league.id,
          amountPence: 1500,
          description: league.description,
        },
      ],
    });
  }
  if (adminMatch) {
    payments.push(
      paid(
        "33333333-3333-4333-8333-333333333303",
        adminMatch,
        "cs_test_admin_match",
        "pi_test_admin_match",
        "2026-10-09T20:40:00.000Z",
      ),
    );
  }

  return {
    players: seedPlayers.map((player) => ({ ...player })),
    charges: charges.map((charge) => refreshCharge(charge, payments)),
    payments,
    stripeEvents: new Set(),
  };
}

const globalForStore = globalThis as typeof globalThis & { bfwMemory?: Memory };

function memory(): Memory {
  if (!globalForStore.bfwMemory) globalForStore.bfwMemory = createMemory();
  return globalForStore.bfwMemory;
}

export function resetMockStore(): void {
  globalForStore.bfwMemory = createMemory();
}

function mapPayment(payment: Payment): Payment {
  const charges = memory().charges;
  return {
    ...payment,
    allocations: payment.allocations.map((allocation) => ({
      ...allocation,
      description:
        charges.find((charge) => charge.id === allocation.chargeId)?.description ??
        allocation.description,
    })),
  };
}

export class MockClubStore implements ClubStore {
  async getPlayerById(id: string): Promise<Player | null> {
    return memory().players.find((player) => player.id === id) ?? null;
  }

  async getPlayerByPhone(phoneE164: string): Promise<Player | null> {
    return memory().players.find((player) => player.phoneE164 === phoneE164) ?? null;
  }

  async listPlayers(): Promise<Player[]> {
    return [...memory().players].sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  async listChargesForPlayer(playerId: string): Promise<Charge[]> {
    return memory()
      .charges.filter((charge) => charge.playerId === playerId)
      .sort((a, b) => a.dueOn.localeCompare(b.dueOn));
  }

  async listOpenChargesByIds(playerId: string, chargeIds: string[]): Promise<Charge[]> {
    const wanted = new Set(chargeIds);
    return memory().charges.filter(
      (charge) =>
        charge.playerId === playerId &&
        (charge.status === "open" || charge.status === "partial") &&
        charge.remainingPence > 0 &&
        wanted.has(charge.id),
    );
  }

  async listPaymentsForPlayer(playerId: string): Promise<Payment[]> {
    return memory()
      .payments.filter((payment) => payment.playerId === playerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(mapPayment);
  }

  async squadBalances(): Promise<PlayerBalance[]> {
    const today = todayIsoDate();
    return memory().players.map((player) => {
      const open = memory().charges.filter(
        (charge) =>
          charge.playerId === player.id &&
          (charge.status === "open" || charge.status === "partial"),
      );
      return {
        player,
        openPence: open.reduce((sum, charge) => sum + charge.remainingPence, 0),
        overdueCount: open.filter((charge) => charge.dueOn < today).length,
      };
    });
  }

  async createCharges(input: {
    playerIds: string[];
    category: Charge["category"];
    description: string;
    amountPence: number;
    dueOn: string;
    createdBy: string;
  }): Promise<Charge[]> {
    void input.createdBy;
    const created = input.playerIds.map((playerId) => {
      const charge: Charge = {
        id: randomUUID(),
        playerId,
        category: input.category,
        description: input.description,
        amountPence: input.amountPence,
        remainingPence: input.amountPence,
        dueOn: input.dueOn,
        status: "open",
        createdAt: new Date().toISOString(),
      };
      memory().charges.push(charge);
      return charge;
    });
    return created;
  }

  async createPendingPayment(input: {
    playerId: string;
    chargeIds: string[];
    amountPence: number;
    stripeCheckoutSessionId: string | null;
  }): Promise<Payment> {
    const charges = await this.listOpenChargesByIds(input.playerId, input.chargeIds);
    const allocations = charges.map((charge) => ({
      chargeId: charge.id,
      amountPence: charge.remainingPence,
      description: charge.description,
    }));
    const amountPence = allocations.reduce((sum, row) => sum + row.amountPence, 0);
    const now = new Date().toISOString();
    const payment: Payment = {
      id: randomUUID(),
      playerId: input.playerId,
      amountPence,
      currency: "gbp",
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
      stripePaymentIntentId: null,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      allocations,
    };
    memory().payments.push(payment);
    return mapPayment(payment);
  }

  async completePayment(input: {
    paymentId?: string;
    stripeCheckoutSessionId?: string;
    stripePaymentIntentId?: string;
  }): Promise<Payment | null> {
    const payment = memory().payments.find((row) => {
      if (input.paymentId && row.id === input.paymentId) return true;
      return Boolean(
        input.stripeCheckoutSessionId &&
          row.stripeCheckoutSessionId === input.stripeCheckoutSessionId,
      );
    });
    if (!payment) return null;
    payment.status = "succeeded";
    payment.updatedAt = new Date().toISOString();
    if (input.stripePaymentIntentId) {
      payment.stripePaymentIntentId = input.stripePaymentIntentId;
    }
    memory().charges = memory().charges.map((charge) => refreshCharge(charge, memory().payments));
    return mapPayment(payment);
  }

  async ingestStripeEvent(input: {
    stripeEventId: string;
    eventType: string;
    payload: unknown;
    stripeCheckoutSessionId?: string | null;
    stripePaymentIntentId?: string | null;
  }): Promise<boolean> {
    if (memory().stripeEvents.has(input.stripeEventId)) return false;
    memory().stripeEvents.add(input.stripeEventId);
    if (input.eventType === "checkout.session.completed" && input.stripeCheckoutSessionId) {
      await this.completePayment({
        stripeCheckoutSessionId: input.stripeCheckoutSessionId,
        stripePaymentIntentId: input.stripePaymentIntentId ?? undefined,
      });
    }
    return true;
  }
}
