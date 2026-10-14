import { AppHeader } from "@/components/AppHeader";
import { IssueChargeForm } from "@/components/IssueChargeForm";
import { getStore } from "@/lib/data";
import { formatGbp } from "@/lib/money";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.role !== "admin") redirect("/account");

  const store = getStore();
  const [balances, players] = await Promise.all([store.squadBalances(), store.listPlayers()]);
  const clubOpen = balances.reduce((sum, row) => sum + row.openPence, 0);

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-3xl uppercase tracking-wide text-paper">Admin</h1>
        <p className="mt-2 text-sm text-mist">
          Squad balances. Outstanding across the club:{" "}
          <span className="text-gold">{formatGbp(clubOpen)}</span>
        </p>
        <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-panel">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wider text-mist">
              <tr>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Outstanding</th>
                <th className="px-4 py-3">Overdue items</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((row) => (
                <tr key={row.player.id} className="border-b border-line/60">
                  <td className="px-4 py-3 text-paper">{row.player.fullName}</td>
                  <td className="px-4 py-3">{formatGbp(row.openPence)}</td>
                  <td className="px-4 py-3">{row.overdueCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-8">
          <IssueChargeForm players={players} />
        </div>
      </main>
    </div>
  );
}
