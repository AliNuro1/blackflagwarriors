import { AdminNav } from "@/components/admin/AdminNav";
import { ChargeFilters, ChargeRow } from "@/components/admin/ChargeManager";
import { IssueChargeForm } from "@/components/IssueChargeForm";
import { AdminAccessError, loadAdminCharges, parseAdminFilters } from "@/lib/admin/dashboard";
import { getStore } from "@/lib/data";
import { getSession } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Admin · Charges" };

export default async function AdminChargesPage({
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
    data = await loadAdminCharges({
      session: await getSession(),
      store: getStore(),
      filters,
    });
  } catch (error) {
    if (error instanceof AdminAccessError && error.status === 401) redirect("/");
    redirect("/account");
  }
  const names = new Map(data.players.map((player) => [player.id, player.fullName]));
  const query = {
    playerId: filters.playerId,
    category: filters.category,
    chargeStatus: filters.chargeStatus,
    from: filters.from,
    to: filters.to,
  };
  const exportHref = `/api/admin/reports/charges?${params.toString()}`;

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-3xl uppercase tracking-wide">Charges</h1>
      <p className="mt-2 text-sm text-mist">
        Post training, match-day and other fees. Voiding stops further collection and does not
        delete confirmed payments. {data.overdueCount} overdue in this view.
      </p>
      <AdminNav current="/admin/charges" />
      <ChargeFilters players={data.players} query={query} />
      <p className="mt-3">
        <Link className="text-sm text-gold underline-offset-2 hover:underline" href={exportHref}>
          Export filtered charges CSV
        </Link>
      </p>
      <div className="mt-8">
        <IssueChargeForm players={data.players.filter((player) => player.status === "active")} />
      </div>
      <ul className="mt-6 space-y-3">
        {data.charges.map((charge) => (
          <ChargeRow
            key={charge.id}
            charge={charge}
            playerName={names.get(charge.playerId) ?? "Player"}
          />
        ))}
      </ul>
    </main>
  );
}
