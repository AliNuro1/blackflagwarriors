import { getStore } from "@/lib/data";
import { CHARGE_CATEGORY_LABEL } from "@/lib/data/types";
import { formatDateTime } from "@/lib/dates";
import { formatGbp } from "@/lib/money";
import { getSession } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { redirect } from "next/navigation";

export const metadata = { title: "Payment history" };

export default async function HistoryPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const store = getStore();
  const [payments, charges] = await Promise.all([
    store.listPaymentsForPlayer(session.playerId),
    store.listChargesForPlayer(session.playerId),
  ]);

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-3xl uppercase tracking-wide text-paper">History</h1>
      <p className="mt-2 text-sm text-mist">Card receipts and settled fees for this season.</p>
      {payments.length === 0 ? (
        <p className="mt-8 rounded-xl border border-line bg-panel p-6 text-fog">
          No payments recorded yet.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {payments.map((payment) => (
            <li key={payment.id} className="rounded-xl border border-line bg-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-paper">{formatGbp(payment.amountPence)}</p>
                  <p className="text-sm text-mist">
                    {payment.status === "succeeded"
                      ? formatDateTime(payment.updatedAt)
                      : "Pending"}{" "}
                    · {payment.currency.toUpperCase()}
                  </p>
                </div>
                <Badge tone={payment.status === "succeeded" ? "ok" : "warn"}>
                  {payment.status}
                </Badge>
              </div>
              <ul className="mt-3 list-disc pl-5 text-sm text-fog">
                {payment.allocations.map((allocation) => (
                  <li key={allocation.chargeId}>
                    {formatGbp(allocation.amountPence)} ·{" "}
                    {allocation.description ?? "Club fee"}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      <h2 className="mt-10 font-display text-xl uppercase tracking-wider">Settled items</h2>
      <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-panel">
        {charges
          .filter((charge) => charge.status === "paid" || charge.status === "partial")
          .map((charge) => (
            <li key={charge.id} className="flex justify-between gap-3 px-4 py-3 text-sm">
              <span>
                <span className="text-paper">{charge.description}</span>
                <span className="ml-2 text-mist">{CHARGE_CATEGORY_LABEL[charge.category]}</span>
              </span>
              <span>
                {charge.status === "partial"
                  ? `${formatGbp(charge.amountPence - charge.remainingPence)} of ${formatGbp(charge.amountPence)}`
                  : formatGbp(charge.amountPence)}
              </span>
            </li>
          ))}
      </ul>
    </main>
  );
}
