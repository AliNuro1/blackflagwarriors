import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";
import type {
  Charge,
  ChargeCategory,
  ChargeStatus,
  ClubStore,
  Payment,
  PaymentStatus,
  Player,
  PlayerBalance,
  UserRole,
} from "./types";

interface ProfileRow {
  id: string;
  phone_e164: string;
  full_name: string;
  role: UserRole;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

interface ChargeRow {
  id: string;
  player_id: string;
  description: string;
  category: ChargeCategory;
  amount_pence: number;
  due_on: string;
  status: ChargeStatus;
  created_at: string;
}

interface PaymentRow {
  id: string;
  player_id: string;
  amount_pence: number;
  currency: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

interface AllocationRow {
  payment_id: string;
  charge_id: string;
  amount_pence: number;
}

function mapPlayer(row: ProfileRow): Player {
  return {
    id: row.id,
    phoneE164: row.phone_e164,
    fullName: row.full_name,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCharge(row: ChargeRow, remainingPence: number, payablePence = remainingPence): Charge {
  return {
    id: row.id,
    playerId: row.player_id,
    description: row.description,
    category: row.category,
    amountPence: row.amount_pence,
    remainingPence,
    payablePence,
    dueOn: row.due_on,
    status: row.status,
    createdAt: row.created_at,
  };
}

function requireRows<T>(data: T[] | null, error: { message: string } | null): T[] {
  if (error) throw new Error(error.message);
  return data ?? [];
}

function requireRow<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Expected a row from Supabase");
  return data;
}

export class SupabaseClubStore implements ClubStore {
  constructor(private readonly client: SupabaseClient) {}

  private async remainingByCharge(
    chargeIds: string[],
  ): Promise<Map<string, { remaining: number; payable: number }>> {
    const remaining = new Map<string, { remaining: number; payable: number }>();
    if (chargeIds.length === 0) return remaining;
    const { data: charges, error: chargeError } = await this.client
      .from("charges")
      .select("id, amount_pence")
      .in("id", chargeIds);
    const chargeRows = requireRows(
      charges as { id: string; amount_pence: number }[] | null,
      chargeError,
    );
    const { data: allocations, error } = await this.client
      .from("payment_allocations")
      .select("charge_id, amount_pence, payments!inner(status)")
      .in("charge_id", chargeIds);
    if (error) throw new Error(error.message);
    const succeeded = new Map<string, number>();
    const reserved = new Map<string, number>();
    for (const row of allocations ?? []) {
      const record = row as {
        charge_id: string;
        amount_pence: number;
        payments: { status: string } | { status: string }[];
      };
      const status = Array.isArray(record.payments)
        ? record.payments[0]?.status
        : record.payments.status;
      if (status === "succeeded") {
        succeeded.set(record.charge_id, (succeeded.get(record.charge_id) ?? 0) + record.amount_pence);
        reserved.set(record.charge_id, (reserved.get(record.charge_id) ?? 0) + record.amount_pence);
      } else if (status === "pending") {
        reserved.set(record.charge_id, (reserved.get(record.charge_id) ?? 0) + record.amount_pence);
      }
    }
    for (const charge of chargeRows) {
      remaining.set(charge.id, {
        remaining: Math.max(charge.amount_pence - (succeeded.get(charge.id) ?? 0), 0),
        payable: Math.max(charge.amount_pence - (reserved.get(charge.id) ?? 0), 0),
      });
    }
    return remaining;
  }

  async getPlayerById(id: string): Promise<Player | null> {
    const { data, error } = await this.client.from("profiles").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapPlayer(data as ProfileRow) : null;
  }

  async getPlayerByPhone(phoneE164: string): Promise<Player | null> {
    const { data, error } = await this.client
      .from("profiles")
      .select("*")
      .eq("phone_e164", phoneE164)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapPlayer(data as ProfileRow) : null;
  }

  async listPlayers(): Promise<Player[]> {
    const { data, error } = await this.client.from("profiles").select("*").order("full_name");
    return requireRows(data as ProfileRow[] | null, error).map(mapPlayer);
  }

  async listChargesForPlayer(playerId: string): Promise<Charge[]> {
    const { data, error } = await this.client
      .from("charges")
      .select("*")
      .eq("player_id", playerId)
      .order("due_on");
    const rows = requireRows(data as ChargeRow[] | null, error);
    const remaining = await this.remainingByCharge(rows.map((row) => row.id));
    return rows.map((row) => {
      const balances = remaining.get(row.id);
      return mapCharge(
        row,
        balances?.remaining ?? row.amount_pence,
        balances?.payable ?? row.amount_pence,
      );
    });
  }

  async listOpenChargesByIds(playerId: string, chargeIds: string[]): Promise<Charge[]> {
    const all = await this.listChargesForPlayer(playerId);
    const wanted = new Set(chargeIds);
    return all.filter(
      (charge) =>
        wanted.has(charge.id) &&
        (charge.status === "open" || charge.status === "partial") &&
        charge.payablePence > 0,
    );
  }

  async listPaymentsForPlayer(playerId: string): Promise<Payment[]> {
    const { data, error } = await this.client
      .from("payments")
      .select("*")
      .eq("player_id", playerId)
      .order("created_at", { ascending: false });
    const rows = requireRows(data as PaymentRow[] | null, error);
    if (rows.length === 0) return [];

    const { data: items, error: itemError } = await this.client
      .from("payment_allocations")
      .select("payment_id, charge_id, amount_pence")
      .in(
        "payment_id",
        rows.map((row) => row.id),
      );
    const allocations = requireRows(items as AllocationRow[] | null, itemError);
    const chargeIds = [...new Set(allocations.map((row) => row.charge_id))];
    const { data: charges, error: chargeError } = await this.client
      .from("charges")
      .select("id, description")
      .in("id", chargeIds.length ? chargeIds : ["00000000-0000-0000-0000-000000000000"]);
    const chargeRows = requireRows(
      charges as { id: string; description: string }[] | null,
      chargeError,
    );
    const titles = new Map(chargeRows.map((row) => [row.id, row.description]));

    return rows.map((row) => ({
      id: row.id,
      playerId: row.player_id,
      amountPence: row.amount_pence,
      currency: row.currency,
      stripeCheckoutSessionId: row.stripe_checkout_session_id,
      stripePaymentIntentId: row.stripe_payment_intent_id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      allocations: allocations
        .filter((item) => item.payment_id === row.id)
        .map((item) => ({
          chargeId: item.charge_id,
          amountPence: item.amount_pence,
          description: titles.get(item.charge_id) ?? null,
        })),
    }));
  }

  async squadBalances(): Promise<PlayerBalance[]> {
    const players = await this.listPlayers();
    const { data, error } = await this.client
      .from("charges")
      .select("id, player_id, amount_pence, due_on, status")
      .in("status", ["open", "partial"]);
    const open = requireRows(
      data as {
        id: string;
        player_id: string;
        amount_pence: number;
        due_on: string;
        status: string;
      }[] | null,
      error,
    );
    const remaining = await this.remainingByCharge(open.map((row) => row.id));
    const today = new Date().toISOString().slice(0, 10);
    return players.map((player) => {
      const theirs = open.filter((row) => row.player_id === player.id);
      return {
        player,
        openPence: theirs.reduce(
          (sum, row) => sum + (remaining.get(row.id)?.remaining ?? row.amount_pence),
          0,
        ),
        overdueCount: theirs.filter((row) => row.due_on < today).length,
      };
    });
  }

  async createCharges(input: {
    playerIds: string[];
    category: ChargeCategory;
    description: string;
    amountPence: number;
    dueOn: string;
    createdBy: string;
  }): Promise<Charge[]> {
    void input.createdBy;
    const { data, error } = await this.client.rpc("create_charges_for_players", {
      p_player_ids: input.playerIds,
      p_description: input.description,
      p_category: input.category,
      p_amount_pence: input.amountPence,
      p_due_on: input.dueOn,
    });
    const rows = requireRows(data as ChargeRow[] | null, error);
    return rows.map((row) => mapCharge(row, row.amount_pence));
  }

  async createPendingPayment(input: {
    playerId: string;
    chargeIds: string[];
    amountPence: number;
    stripeCheckoutSessionId: string | null;
  }): Promise<Payment> {
    void input.amountPence;
    const { data, error } = await this.client.rpc("begin_checkout", {
      p_player_id: input.playerId,
      p_charge_ids: input.chargeIds,
      p_stripe_checkout_session_id: input.stripeCheckoutSessionId,
    });
    const row = requireRow(data as PaymentRow | null, error);
    const listed = await this.listPaymentsForPlayer(input.playerId);
    return listed.find((payment) => payment.id === row.id) ?? {
      id: row.id,
      playerId: row.player_id,
      amountPence: row.amount_pence,
      currency: row.currency,
      stripeCheckoutSessionId: row.stripe_checkout_session_id,
      stripePaymentIntentId: row.stripe_payment_intent_id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      allocations: input.chargeIds.map((chargeId) => ({
        chargeId,
        amountPence: 0,
        description: null,
      })),
    };
  }

  async completePayment(input: {
    paymentId?: string;
    stripeCheckoutSessionId?: string;
    stripePaymentIntentId?: string;
  }): Promise<Payment | null> {
    const { data, error } = await this.client.rpc("complete_payment", {
      p_payment_id: input.paymentId ?? null,
      p_stripe_checkout_session_id: input.stripeCheckoutSessionId ?? null,
      p_stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
    });
    if (error) throw new Error(error.message);
    if (!data) return null;
    const row = data as PaymentRow;
    const listed = await this.listPaymentsForPlayer(row.player_id);
    return listed.find((payment) => payment.id === row.id) ?? null;
  }

  async abandonPayment(input: {
    paymentId?: string;
    stripeCheckoutSessionId?: string;
    status: Extract<PaymentStatus, "failed" | "cancelled" | "expired">;
  }): Promise<Payment | null> {
    const { data, error } = await this.client.rpc("abandon_payment", {
      p_payment_id: input.paymentId ?? null,
      p_stripe_checkout_session_id: input.stripeCheckoutSessionId ?? null,
      p_status: input.status,
    });
    if (error) throw new Error(error.message);
    if (!data) return null;
    const row = data as PaymentRow;
    const listed = await this.listPaymentsForPlayer(row.player_id);
    return listed.find((payment) => payment.id === row.id) ?? null;
  }

  async getPaymentByStripeSession(sessionId: string): Promise<Payment | null> {
    const { data, error } = await this.client
      .from("payments")
      .select("*")
      .eq("stripe_checkout_session_id", sessionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const row = data as PaymentRow;
    const listed = await this.listPaymentsForPlayer(row.player_id);
    return listed.find((payment) => payment.id === row.id) ?? null;
  }

  async ingestStripeEvent(input: {
    stripeEventId: string;
    eventType: string;
    payload: unknown;
    stripeCheckoutSessionId?: string | null;
    stripePaymentIntentId?: string | null;
    apply?: boolean;
  }): Promise<boolean> {
    void input.apply;
    const { data, error } = await this.client.rpc("ingest_stripe_event", {
      p_stripe_event_id: input.stripeEventId,
      p_event_type: input.eventType,
      p_payload: input.payload ?? {},
      p_stripe_checkout_session_id: input.stripeCheckoutSessionId ?? null,
      p_stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
    });
    if (error) throw new Error(error.message);
    return Boolean(data);
  }
}

export function createSupabaseStore(): SupabaseClubStore {
  const env = getEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase is not configured");
  }
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return new SupabaseClubStore(client);
}
