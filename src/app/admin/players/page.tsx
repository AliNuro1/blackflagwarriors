import { AdminNav } from "@/components/admin/AdminNav";
import { CreatePlayerForm, PlayerRow } from "@/components/admin/PlayerForms";
import { AdminAccessError, loadAdminPlayers } from "@/lib/admin/dashboard";
import { getStore } from "@/lib/data";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const metadata = { title: "Admin · Players" };

export default async function AdminPlayersPage() {
  let data;
  try {
    data = await loadAdminPlayers({ session: await getSession(), store: getStore() });
  } catch (error) {
    if (error instanceof AdminAccessError && error.status === 401) redirect("/");
    redirect("/account");
  }
  const byId = new Map(data.balances.map((row) => [row.player.id, row]));

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-3xl uppercase tracking-wide">Players</h1>
      <p className="mt-2 text-sm text-mist">
        Register, edit, and deactivate squad members. Historical payments stay on file. Players
        cannot grant themselves administrator rights.
      </p>
      <AdminNav current="/admin/players" />
      <div className="mt-8">
        <CreatePlayerForm />
      </div>
      <ul className="mt-6 space-y-3">
        {data.players.map((player) => (
          <PlayerRow key={player.id} player={player} balance={byId.get(player.id)} />
        ))}
      </ul>
    </main>
  );
}
