import Link from "next/link";
import { ChargeStatusBadge, PaymentStatusBadge } from "@/components/dashboard/ChargeStatusBadge";
import { PayOutstandingForm } from "@/components/dashboard/PayOutstandingForm";
import type { PlayerDashboard as DashboardData } from "@/lib/dashboard";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatGbp } from "@/lib/money";

export function PlayerDashboard({ data }: { data: DashboardData }) {
  const payable = data.charges.filter(
    (charge) => charge.status === "outstanding" || charge.status === "partial",
  );

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-8">
      {data.developmentSeed ? (
        <p
          className="mb-6 rounded-md border border-line bg-panel px-3 py-2 text-xs text-mist"
          role="status"
        >
          Development seed data — fictional squad figures, not live club accounts. Card payments
          (Stripe) are not connected in this build.
        </p>
      ) : null}

      <p className="text-xs uppercase tracking-[0.22em] text-mist">Black Flag Warriors</p>
      <h1 className="mt-1 font-display text-4xl uppercase tracking-wide text-paper">
        {data.player.fullName}
      </h1>
      <p className="mt-1 text-sm text-fog">Private player account · 2026/27 season</p>

      <section aria-labelledby="balance-heading" className="mt-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-panel p-5">
          <h2 id="balance-heading" className="text-xs uppercase tracking-wider text-mist">
            Outstanding balance
          </h2>
          <p className="mt-1 font-display text-4xl text-paper">{formatGbp(data.outstandingPence)}</p>
        </div>
        <div className="rounded-xl border border-line bg-panel p-5">
          <h2 className="text-xs uppercase tracking-wider text-mist">Of which overdue</h2>
          <p className="mt-1 font-display text-4xl text-paper">{formatGbp(data.overduePence)}</p>
        </div>
      </section>

      <section aria-labelledby="charges-heading" className="mt-10">
        <h2 id="charges-heading" className="font-display text-xl uppercase tracking-wider">
          Charges
        </h2>
        <p className="mt-1 text-sm text-mist">
          Amounts are in pounds and pence from club records. Remaining is what is still due.
        </p>

        {data.charges.length === 0 ? (
          <div className="mt-4 rounded-xl border border-line bg-panel p-8 text-center">
            <p className="font-display text-xl uppercase tracking-wider">No charges yet</p>
            <p className="mt-2 text-sm text-fog">
              When the club posts match fees or subs, they will show up here.
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel">
            {data.charges.map((charge) => (
              <li key={charge.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-paper">{charge.description}</p>
                  <p className="mt-1 text-sm text-mist">
                    {charge.category} · due {formatDate(charge.dueOn)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <ChargeStatusBadge status={charge.status} overdue={charge.overdue} />
                  </div>
                </div>
                <div className="shrink-0 text-sm sm:text-right">
                  <p className="font-semibold text-paper">
                    {formatGbp(charge.remainingPence)} remaining
                  </p>
                  <p className="text-mist">of {formatGbp(charge.amountPence)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {payable.length === 0 ? (
        <div className="mt-8 rounded-xl border border-line bg-panel p-8 text-center">
          <p className="font-display text-xl uppercase tracking-wider">Nothing to pay</p>
          <p className="mt-2 text-sm text-fog">
            You have no outstanding or part-paid fees. You are square with the club.
          </p>
        </div>
      ) : (
        <PayOutstandingForm
          outstandingPence={data.outstandingPence}
          itemCount={payable.length}
        />
      )}

      <section aria-labelledby="history-heading" className="mt-12">
        <h2 id="history-heading" className="font-display text-xl uppercase tracking-wider">
          Confirmed payments
        </h2>
        {data.payments.length === 0 ? (
          <p className="mt-4 rounded-xl border border-line bg-panel p-6 text-sm text-fog">
            No payments recorded yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {data.payments.map((payment) => (
              <li key={payment.id} className="rounded-xl border border-line bg-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-paper">{formatGbp(payment.amountPence)}</p>
                    <p className="text-sm text-mist">
                      {formatDateTime(payment.updatedAt)} · {payment.currency.toUpperCase()}
                    </p>
                  </div>
                  <PaymentStatusBadge status={payment.status} />
                </div>
                <ul className="mt-3 list-disc pl-5 text-sm text-fog">
                  {payment.allocations.map((allocation) => (
                    <li key={`${payment.id}-${allocation.description}-${allocation.amountPence}`}>
                      {formatGbp(allocation.amountPence)} · {allocation.description}
                    </li>
                  ))}
                </ul>
                {payment.receiptHref ? (
                  <Link
                    href={payment.receiptHref}
                    className="mt-3 inline-block text-sm text-paper underline underline-offset-4 hover:text-fog"
                  >
                    View receipt
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
