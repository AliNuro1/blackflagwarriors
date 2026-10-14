import { z } from "zod";
import { getStore } from "@/lib/data";
import { jsonError, jsonOk } from "@/lib/http";
import { getSession } from "@/lib/session";
import { startCheckout } from "@/lib/stripe";

const bodySchema = z.object({
  chargeIds: z.array(z.string().uuid()).min(1),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return jsonError("Sign in to pay.", 401);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Select at least one unpaid item.");
  }

  const store = getStore();
  const player = await store.getPlayerById(session.playerId);
  if (!player) return jsonError("Player record missing.", 403);

  const charges = await store.listOpenChargesByIds(player.id, parsed.data.chargeIds);
  if (charges.length !== parsed.data.chargeIds.length) {
    return jsonError("One of those items is no longer due, or is not yours.");
  }

  try {
    const url = await startCheckout(player, charges);
    return jsonOk({ url });
  } catch (error) {
    console.error("Checkout failed", error);
    return jsonError("We could not start card payment. Try again.", 502);
  }
}
