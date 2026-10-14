import type { ClubStore, Charge, Payment, Player } from "@/lib/data/types";
import { CHARGE_CATEGORY_LABEL } from "@/lib/data/types";
import type { SessionPayload } from "@/lib/auth/session";
import { isOverdue } from "@/lib/dates";

export class DashboardAccessError extends Error {
  constructor(public readonly code: "unauthenticated" | "forbidden") {
    super(code);
    this.name = "DashboardAccessError";
  }
}

export type ChargeDisplayStatus = "outstanding" | "partial" | "paid" | "void";

export interface DashboardCharge {
  id: string;
  description: string;
  category: string;
  dueOn: string;
  amountPence: number;
  remainingPence: number;
  settledPence: number;
  status: ChargeDisplayStatus;
  overdue: boolean;
}

export interface DashboardPayment {
  id: string;
  amountPence: number;
  currency: string;
  status: Payment["status"];
  createdAt: string;
  updatedAt: string;
  receiptHref: string | null;
  allocations: { description: string; amountPence: number }[];
}

export interface PlayerDashboard {
  player: Pick<Player, "id" | "fullName" | "role">;
  outstandingPence: number;
  overduePence: number;
  charges: DashboardCharge[];
  payments: DashboardPayment[];
  developmentSeed: boolean;
}

export function chargeDisplayStatus(charge: Charge): ChargeDisplayStatus {
  if (charge.status === "void") return "void";
  if (charge.status === "paid" || charge.remainingPence <= 0) return "paid";
  if (charge.status === "partial" || charge.remainingPence < charge.amountPence) {
    return "partial";
  }
  return "outstanding";
}

export function outstandingPenceFromCharges(charges: Charge[]): number {
  return charges.reduce((sum, charge) => {
    if (chargeDisplayStatus(charge) === "outstanding" || chargeDisplayStatus(charge) === "partial") {
      return sum + charge.remainingPence;
    }
    return sum;
  }, 0);
}

function mapCharge(charge: Charge, now?: Date): DashboardCharge {
  const status = chargeDisplayStatus(charge);
  return {
    id: charge.id,
    description: charge.description,
    category: CHARGE_CATEGORY_LABEL[charge.category],
    dueOn: charge.dueOn,
    amountPence: charge.amountPence,
    remainingPence: charge.remainingPence,
    settledPence: charge.amountPence - charge.remainingPence,
    status,
    overdue: status !== "paid" && status !== "void" && isOverdue(charge.dueOn, now),
  };
}

function mapPayment(payment: Payment): DashboardPayment {
  const confirmed = payment.status === "succeeded";
  return {
    id: payment.id,
    amountPence: payment.amountPence,
    currency: payment.currency,
    status: payment.status,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    receiptHref: confirmed ? `/account/receipts/${payment.id}` : null,
    allocations: payment.allocations.map((allocation) => ({
      description: allocation.description ?? "Club fee",
      amountPence: allocation.amountPence,
    })),
  };
}

export async function loadPlayerDashboard(input: {
  session: SessionPayload | null;
  store: ClubStore;
  requestedPlayerId?: string;
  developmentSeed?: boolean;
  now?: Date;
}): Promise<PlayerDashboard> {
  if (!input.session) {
    throw new DashboardAccessError("unauthenticated");
  }
  if (input.requestedPlayerId && input.requestedPlayerId !== input.session.playerId) {
    throw new DashboardAccessError("forbidden");
  }

  const playerId = input.session.playerId;
  const player = await input.store.getPlayerById(playerId);
  if (!player || player.status !== "active") {
    throw new DashboardAccessError("unauthenticated");
  }

  const [rawCharges, rawPayments] = await Promise.all([
    input.store.listChargesForPlayer(playerId),
    input.store.listPaymentsForPlayer(playerId),
  ]);

  if (rawCharges.some((charge) => charge.playerId !== playerId)) {
    throw new DashboardAccessError("forbidden");
  }
  if (rawPayments.some((payment) => payment.playerId !== playerId)) {
    throw new DashboardAccessError("forbidden");
  }

  const charges = rawCharges.map((charge) => mapCharge(charge, input.now));
  const outstandingPence = outstandingPenceFromCharges(rawCharges);
  const overduePence = charges
    .filter((charge) => charge.overdue)
    .reduce((sum, charge) => sum + charge.remainingPence, 0);

  return {
    player: { id: player.id, fullName: player.fullName, role: player.role },
    outstandingPence,
    overduePence,
    charges,
    payments: rawPayments.map(mapPayment),
    developmentSeed: input.developmentSeed ?? true,
  };
}
