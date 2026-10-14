export type UserRole = "player" | "admin";
export type MembershipStatus = "active" | "inactive";
export type ChargeCategory =
  | "match_fee"
  | "training"
  | "league_subs"
  | "kit"
  | "fine"
  | "social";
export type ChargeStatus = "open" | "partial" | "paid" | "void";
export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

export interface Player {
  id: string;
  phoneE164: string;
  fullName: string;
  role: UserRole;
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Charge {
  id: string;
  playerId: string;
  description: string;
  category: ChargeCategory;
  amountPence: number;
  remainingPence: number;
  dueOn: string;
  status: ChargeStatus;
  createdAt: string;
}

export interface Payment {
  id: string;
  playerId: string;
  amountPence: number;
  currency: string;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  allocations: { chargeId: string; amountPence: number; description: string | null }[];
}

export interface PlayerBalance {
  player: Player;
  openPence: number;
  overdueCount: number;
}

export interface ClubStore {
  getPlayerById(id: string): Promise<Player | null>;
  getPlayerByPhone(phoneE164: string): Promise<Player | null>;
  listPlayers(): Promise<Player[]>;
  listChargesForPlayer(playerId: string): Promise<Charge[]>;
  listOpenChargesByIds(playerId: string, chargeIds: string[]): Promise<Charge[]>;
  listPaymentsForPlayer(playerId: string): Promise<Payment[]>;
  squadBalances(): Promise<PlayerBalance[]>;
  createCharges(input: {
    playerIds: string[];
    category: ChargeCategory;
    description: string;
    amountPence: number;
    dueOn: string;
    createdBy: string;
  }): Promise<Charge[]>;
  createPendingPayment(input: {
    playerId: string;
    chargeIds: string[];
    amountPence: number;
    stripeCheckoutSessionId: string | null;
  }): Promise<Payment>;
  completePayment(input: {
    paymentId?: string;
    stripeCheckoutSessionId?: string;
    stripePaymentIntentId?: string;
  }): Promise<Payment | null>;
  ingestStripeEvent(input: {
    stripeEventId: string;
    eventType: string;
    payload: unknown;
    stripeCheckoutSessionId?: string | null;
    stripePaymentIntentId?: string | null;
  }): Promise<boolean>;
}

export const CHARGE_CATEGORY_LABEL: Record<ChargeCategory, string> = {
  match_fee: "Match fee",
  training: "Training",
  league_subs: "League subs",
  kit: "Kit",
  fine: "Fine",
  social: "Social",
};

/** @deprecated Use CHARGE_CATEGORY_LABEL */
export const CHARGE_KIND_LABEL = CHARGE_CATEGORY_LABEL;
