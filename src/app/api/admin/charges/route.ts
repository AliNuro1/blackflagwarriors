import { z } from "zod";
import { getStore } from "@/lib/data";
import { jsonError, jsonOk } from "@/lib/http";
import { parseGbpToPence } from "@/lib/money";
import { getSession } from "@/lib/session";

const bodySchema = z.object({
  playerIds: z.array(z.string().uuid()).min(1),
  category: z.enum(["match_fee", "training", "league_subs", "kit", "fine", "social"]),
  description: z.string().trim().min(3).max(280),
  amount: z.string().min(1),
  dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required.", 401);
  if (session.role !== "admin") return jsonError("Admin access only.", 403);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Check the charge details and try again.");
  }

  const amountPence = parseGbpToPence(parsed.data.amount);
  if (!amountPence) return jsonError("Enter an amount in pounds, for example 8.00.");

  const created = await getStore().createCharges({
    playerIds: parsed.data.playerIds,
    category: parsed.data.category,
    description: parsed.data.description,
    amountPence,
    dueOn: parsed.data.dueOn,
    createdBy: session.playerId,
  });

  return jsonOk({ ok: true, count: created.length });
}
