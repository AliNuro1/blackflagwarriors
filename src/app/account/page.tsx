import { PlayerDashboard } from "@/components/dashboard/PlayerDashboard";
import { DashboardAccessError, loadPlayerDashboard } from "@/lib/dashboard";
import { getStore } from "@/lib/data";
import { stripeConfigured, usesMockData } from "@/lib/env";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/");

  let data;
  try {
    data = await loadPlayerDashboard({
      session,
      store: getStore(),
      developmentSeed: usesMockData(),
      stripeReady: stripeConfigured(),
    });
  } catch (error) {
    if (error instanceof DashboardAccessError) redirect("/");
    throw error;
  }

  return <PlayerDashboard data={data} />;
}
