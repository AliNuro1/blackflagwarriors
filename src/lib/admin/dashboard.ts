import type { SessionPayload } from "@/lib/auth/session";
import { isOverdue } from "@/lib/dates";
import type {
  AuditEvent,
  Charge,
  ChargeCategory,
  ChargeStatus,
  ClubStore,
  Payment,
  PaymentStatus,
  Player,
  PlayerBalance,
} from "@/lib/data/types";
import { AdminAccessError, requireAdmin } from "@/lib/admin/access";

export interface AdminFilters {
  playerId?: string;
  category?: ChargeCategory;
  chargeStatus?: ChargeStatus;
  paymentStatus?: PaymentStatus;
  from?: string;
  to?: string;
}

export interface AdminOverview {
  admin: SessionPayload;
  clubOpenPence: number;
  clubOverduePence: number;
  balances: PlayerBalance[];
  pendingPayments: number;
  failedPayments: number;
}

function inDateRange(isoDate: string, filters: AdminFilters): boolean {
  if (filters.from && isoDate < filters.from) return false;
  if (filters.to && isoDate > filters.to) return false;
  return true;
}

export function filterCharges(
  charges: Charge[],
  filters: AdminFilters,
): Charge[] {
  return charges.filter((charge) => {
    if (filters.playerId && charge.playerId !== filters.playerId) return false;
    if (filters.category && charge.category !== filters.category) return false;
    if (filters.chargeStatus && charge.status !== filters.chargeStatus) return false;
    return inDateRange(charge.dueOn, filters);
  });
}

export function filterPayments(payments: Payment[], filters: AdminFilters): Payment[] {
  return payments.filter((payment) => {
    if (filters.playerId && payment.playerId !== filters.playerId) return false;
    if (filters.paymentStatus && payment.status !== filters.paymentStatus) return false;
    const day = payment.createdAt.slice(0, 10);
    return inDateRange(day, filters);
  });
}

export async function loadAdminOverview(input: {
  session: SessionPayload | null;
  store: ClubStore;
}): Promise<AdminOverview> {
  const admin = await requireAdmin(input.session, input.store);
  const [balances, payments] = await Promise.all([
    input.store.squadBalances(),
    input.store.listAllPayments(),
  ]);
  return {
    admin,
    clubOpenPence: balances.reduce((sum, row) => sum + row.openPence, 0),
    clubOverduePence: balances.reduce((sum, row) => sum + row.overduePence, 0),
    balances,
    pendingPayments: payments.filter((payment) => payment.status === "pending").length,
    failedPayments: payments.filter((payment) =>
      ["failed", "cancelled", "expired"].includes(payment.status),
    ).length,
  };
}

export async function loadAdminPlayers(input: {
  session: SessionPayload | null;
  store: ClubStore;
}): Promise<{ admin: SessionPayload; players: Player[]; balances: PlayerBalance[] }> {
  const admin = await requireAdmin(input.session, input.store);
  const [players, balances] = await Promise.all([
    input.store.listPlayers(),
    input.store.squadBalances(),
  ]);
  return { admin, players, balances };
}

export async function loadAdminCharges(input: {
  session: SessionPayload | null;
  store: ClubStore;
  filters: AdminFilters;
}): Promise<{
  admin: SessionPayload;
  players: Player[];
  charges: Charge[];
  overdueCount: number;
}> {
  const admin = await requireAdmin(input.session, input.store);
  const [players, all] = await Promise.all([
    input.store.listPlayers(),
    input.store.listAllCharges(),
  ]);
  const charges = filterCharges(all, input.filters);
  return {
    admin,
    players,
    charges,
    overdueCount: charges.filter(
      (charge) =>
        (charge.status === "open" || charge.status === "partial") && isOverdue(charge.dueOn),
    ).length,
  };
}

export async function loadAdminPayments(input: {
  session: SessionPayload | null;
  store: ClubStore;
  filters: AdminFilters;
}): Promise<{ admin: SessionPayload; players: Player[]; payments: Payment[] }> {
  const admin = await requireAdmin(input.session, input.store);
  const [players, all] = await Promise.all([
    input.store.listPlayers(),
    input.store.listAllPayments(),
  ]);
  return { admin, players, payments: filterPayments(all, input.filters) };
}

export async function loadAdminAudit(input: {
  session: SessionPayload | null;
  store: ClubStore;
}): Promise<{ admin: SessionPayload; events: AuditEvent[] }> {
  const admin = await requireAdmin(input.session, input.store);
  return { admin, events: await input.store.listAuditEvents() };
}

export function parseAdminFilters(search: URLSearchParams): AdminFilters {
  const playerId = search.get("playerId") ?? undefined;
  const category = search.get("category") as ChargeCategory | undefined;
  const chargeStatus = search.get("chargeStatus") as ChargeStatus | undefined;
  const paymentStatus = search.get("paymentStatus") as PaymentStatus | undefined;
  const from = search.get("from") ?? undefined;
  const to = search.get("to") ?? undefined;
  const date = /^\d{4}-\d{2}-\d{2}$/;
  return {
    playerId: playerId && /^[0-9a-f-]{36}$/i.test(playerId) ? playerId : undefined,
    category: category &&
      ["match_fee", "training", "league_subs", "kit", "fine", "social"].includes(category)
      ? category
      : undefined,
    chargeStatus:
      chargeStatus && ["open", "partial", "paid", "void"].includes(chargeStatus)
        ? chargeStatus
        : undefined,
    paymentStatus:
      paymentStatus &&
      ["pending", "succeeded", "failed", "refunded", "cancelled", "expired"].includes(paymentStatus)
        ? paymentStatus
        : undefined,
    from: from && date.test(from) ? from : undefined,
    to: to && date.test(to) ? to : undefined,
  };
}

export { AdminAccessError };
