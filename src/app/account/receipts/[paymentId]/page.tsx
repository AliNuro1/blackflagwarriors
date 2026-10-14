import Link from "next/link";
import { DashboardAccessError, loadPlayerDashboard } from "@/lib/dashboard";
import { getStore } from "@/lib/data";
import { usesMockData } from "@/lib/env";
import { formatDateTime } from "@/lib/dates";
import { formatGbp } from "@/lib/money";
import { getSession } from "@/lib/session";
import { notFound, redirect } from "next/navigation";

export const metadata = { title: "Receipt" };

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");
  const { paymentId } = await params;

  try {
    const dashboard = await loadPlayerDashboard({
      session,
      store: getStore(),
      developmentSeed: usesMockData(),
    });
    const payment = dashboard.payments.find((item) => item.id === paymentId);
    if (!payment || payment.status !== "succeeded") notFound();

    return (
      <main id="main-content" className="mx-auto max-w-lg px-4 py-10">
        <p className="text-xs uppercase tracking-[0.2em] text-mist">Black Flag Warriors</p>
        <h1 className="mt-2 font-display text-3xl uppercase tracking-wide">Receipt</h1>
        <p className="mt-1 text-sm text-fog">{dashboard.player.fullName}</p>
        <div className="mt-6 rounded-xl border border-line bg-panel p-5">
          <p className="font-display text-3xl">{formatGbp(payment.amountPence)}</p>
          <p className="mt-1 text-sm text-mist">
            Confirmed · {formatDateTime(payment.updatedAt)} · {payment.currency.toUpperCase()}
          </p>
          <ul className="mt-4 list-disc pl-5 text-sm text-fog">
            {payment.allocations.map((allocation) => (
              <li key={`${allocation.description}-${allocation.amountPence}`}>
                {formatGbp(allocation.amountPence)} · {allocation.description}
              </li>
            ))}
          </ul>
        </div>
        {dashboard.developmentSeed ? (
          <p className="mt-4 text-xs text-mist">Development seed receipt — not a Stripe document.</p>
        ) : null}
        <Link href="/account" className="mt-6 inline-block text-sm underline underline-offset-4">
          Back to my account
        </Link>
      </main>
    );
  } catch (error) {
    if (error instanceof DashboardAccessError) redirect("/");
    throw error;
  }
}
