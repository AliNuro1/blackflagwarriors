import { AdminNav } from "@/components/admin/AdminNav";
import { AdminAccessError, loadAdminOverview } from "@/lib/admin/dashboard";
import { getStore } from "@/lib/data";
import { formatGbp } from "@/lib/money";
import { getSession } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  let data;
  try {
    data = await loadAdminOverview({ session: await getSession(), store: getStore() });
  } catch (error) {
    if (error instanceof AdminAccessError && error.status === 401) redirect("/");
    redirect("/account");
  }

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-3xl uppercase tracking-wide text-paper">Administrator</h1>
      <p className="mt-2 text-sm text-mist">
        Signed in as {data.admin.fullName}. Role is read from club records on every request.
      </p>
      <AdminNav current="/admin" />

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Outstanding" value={formatGbp(data.clubOpenPence)} />
        <Stat label="Overdue" value={formatGbp(data.clubOverduePence)} />
        <Stat label="Pending checkouts" value={String(data.pendingPayments)} />
        <Stat label="Failed or expired" value={String(data.failedPayments)} />
      </section>

      <div className="mt-8 overflow-x-auto rounded-xl border border-line bg-panel">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wider text-mist">
            <tr>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Outstanding</th>
              <th className="px-4 py-3">Overdue</th>
            </tr>
          </thead>
          <tbody>
            {data.balances.map((row) => (
              <tr key={row.player.id} className="border-b border-line/60">
                <td className="px-4 py-3 text-paper">
                  <Link className="underline-offset-2 hover:underline" href={`/admin/players?focus=${row.player.id}`}>
                    {row.player.fullName}
                  </Link>
                  {row.player.role === "admin" ? (
                    <span className="ml-2 text-xs uppercase tracking-wider text-gold">Admin</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 capitalize">{row.player.status}</td>
                <td className="px-4 py-3">{formatGbp(row.openPence)}</td>
                <td className="px-4 py-3">
                  {formatGbp(row.overduePence)}
                  {row.overdueCount ? ` · ${row.overdueCount}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <p className="text-xs uppercase tracking-wider text-mist">{label}</p>
      <p className="mt-1 font-display text-2xl text-paper">{value}</p>
    </div>
  );
}
