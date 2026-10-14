import { AdminNav } from "@/components/admin/AdminNav";
import { AdminAccessError, loadAdminPayments, parseAdminFilters } from "@/lib/admin/dashboard";
import { PaymentStatusBadge } from "@/components/dashboard/ChargeStatusBadge";
import { getStore } from "@/lib/data";
import { formatDateTime } from "@/lib/dates";
import { formatGbp } from "@/lib/money";
import { getSession } from "@/lib/session";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Admin · Payments" };

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") params.set(key, value);
  }
  const filters = parseAdminFilters(params);
  let data;
  try {
    data = await loadAdminPayments({
      session: await getSession(),
      store: getStore(),
      filters,
    });
  } catch (error) {
    if (error instanceof AdminAccessError && error.status === 401) redirect("/");
    redirect("/account");
  }
  const names = new Map(data.players.map((player) => [player.id, player.fullName]));
  const exportHref = `/api/admin/reports/payments?${params.toString()}`;

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-3xl uppercase tracking-wide">Payments</h1>
      <p className="mt-2 text-sm text-mist">
        Confirmed, pending, failed, cancelled and expired Checkout records. Historical rows cannot
        be deleted to adjust a balance.
      </p>
      <AdminNav current="/admin/payments" />
      <form className="mt-6 grid gap-3 rounded-xl border border-line bg-panel p-4 sm:grid-cols-2 lg:grid-cols-4" method="get">
        <Select name="playerId" defaultValue={filters.playerId ?? ""} aria-label="Player">
          <option value="">All players</option>
          {data.players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.fullName}
            </option>
          ))}
        </Select>
        <Select name="paymentStatus" defaultValue={filters.paymentStatus ?? ""} aria-label="Status">
          <option value="">All statuses</option>
          <option value="succeeded">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
          <option value="refunded">Refunded</option>
        </Select>
        <Input type="date" name="from" defaultValue={filters.from ?? ""} aria-label="From" />
        <Input type="date" name="to" defaultValue={filters.to ?? ""} aria-label="To" />
        <Button type="submit" size="sm" className="sm:col-span-2 lg:col-span-4">
          Filter
        </Button>
      </form>
      <p className="mt-3">
        <Link className="text-sm text-gold underline-offset-2 hover:underline" href={exportHref}>
          Export filtered payments CSV
        </Link>
      </p>
      <ul className="mt-6 space-y-3">
        {data.payments.map((payment) => (
          <li key={payment.id} className="rounded-xl border border-line bg-panel p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-paper">
                  {formatGbp(payment.amountPence)} · {names.get(payment.playerId)}
                </p>
                <p className="text-sm text-mist">{formatDateTime(payment.createdAt)}</p>
              </div>
              <PaymentStatusBadge status={payment.status} />
            </div>
            <ul className="mt-2 list-disc pl-5 text-sm text-fog">
              {payment.allocations.map((allocation) => (
                <li key={`${payment.id}-${allocation.chargeId}`}>
                  {formatGbp(allocation.amountPence)} · {allocation.description}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </main>
  );
}
