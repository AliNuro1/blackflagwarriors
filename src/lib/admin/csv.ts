import { CHARGE_CATEGORY_LABEL, type Charge, type Payment, type Player } from "@/lib/data/types";
import { formatGbp } from "@/lib/money";

function cell(value: string | number): string {
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function paymentsCsv(payments: Payment[], players: Player[]): string {
  const names = new Map(players.map((player) => [player.id, player.fullName]));
  const header = [
    "payment_id",
    "player",
    "status",
    "amount_gbp",
    "currency",
    "created_at",
    "allocations",
  ];
  const rows = payments.map((payment) =>
    [
      payment.id,
      names.get(payment.playerId) ?? payment.playerId,
      payment.status,
      formatGbp(payment.amountPence),
      payment.currency,
      payment.createdAt,
      payment.allocations
        .map((row) => `${formatGbp(row.amountPence)} ${row.description ?? ""}`.trim())
        .join("; "),
    ]
      .map(cell)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export function chargesCsv(charges: Charge[], players: Player[]): string {
  const names = new Map(players.map((player) => [player.id, player.fullName]));
  const header = [
    "charge_id",
    "player",
    "category",
    "description",
    "status",
    "amount_gbp",
    "remaining_gbp",
    "due_on",
  ];
  const rows = charges.map((charge) =>
    [
      charge.id,
      names.get(charge.playerId) ?? charge.playerId,
      CHARGE_CATEGORY_LABEL[charge.category],
      charge.description,
      charge.status,
      formatGbp(charge.amountPence),
      formatGbp(charge.remainingPence),
      charge.dueOn,
    ]
      .map(cell)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}
