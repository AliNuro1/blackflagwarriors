import { loadPlayerDashboard } from "@/lib/dashboard";
import { getStore } from "@/lib/data";
import { usesMockData } from "@/lib/env";
import { jsonError, jsonOk } from "@/lib/http";
import { formatGbp } from "@/lib/money";
import { getSession } from "@/lib/session";

export async function POST() {
  const session = await getSession();
  if (!session) return jsonError("Sign in to pay.", 401);

  try {
    const dashboard = await loadPlayerDashboard({
      session,
      store: getStore(),
      developmentSeed: usesMockData(),
    });
    if (dashboard.outstandingPence <= 0) {
      return jsonError("There is nothing outstanding on your account.");
    }
    return jsonOk({
      ok: true,
      amountPence: dashboard.outstandingPence,
      development: true,
      message: `Card payments are not connected. Club records show ${formatGbp(dashboard.outstandingPence)} outstanding. Stripe is not implemented in this build.`,
    });
  } catch {
    return jsonError("Sign in to pay.", 401);
  }
}
