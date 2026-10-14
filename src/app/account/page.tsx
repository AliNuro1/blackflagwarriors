import { ChargesPayForm } from "@/components/ChargesPayForm";
import { getStore } from "@/lib/data";
import { formatGbp } from "@/lib/money";
import { getSession } from "@/lib/session";
import { isOverdue } from "@/lib/dates";
import { redirect } from "next/navigation";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const store = getStore();
  const player = await store.getPlayerById(session.playerId);
  if (!player) redirect("/");

  const charges = await store.listChargesForPlayer(player.id);
  const open = charges.filter(
    (charge) => charge.status === "open" || charge.status === "partial",
  );
  const overduePence = open
    .filter((charge) => isOverdue(charge.dueOn))
    .reduce((sum, charge) => sum + charge.remainingPence, 0);
  const openPence = open.reduce((sum, charge) => sum + charge.remainingPence, 0);

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-xs uppercase tracking-[0.2em] text-mist">2026/27 season</p>
      <h1 className="mt-1 font-display text-4xl uppercase tracking-wide text-paper">
        {player.fullName}
      </h1>
      <p className="mt-1 text-sm text-fog">
        {player.role === "admin" ? "Admin" : "Player"} · registered mobile on the squad list
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-panel p-4">
          <p className="text-xs uppercase tracking-wider text-mist">Outstanding</p>
          <p className="font-display text-3xl text-gold">{formatGbp(openPence)}</p>
        </div>
        <div className="rounded-xl border border-line bg-panel p-4">
          <p className="text-xs uppercase tracking-wider text-mist">Overdue</p>
          <p className="font-display text-3xl text-paper">{formatGbp(overduePence)}</p>
        </div>
      </div>
      <h2 className="mt-10 font-display text-xl uppercase tracking-wider text-paper">Open fees</h2>
      <p className="mb-4 mt-1 text-sm text-mist">
        Select what you want to pay. Cards are processed by Stripe in pounds sterling.
      </p>
      <ChargesPayForm charges={open} />
    </main>
  );
}
