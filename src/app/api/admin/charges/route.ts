import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/http";
import { parseGbpToPence } from "@/lib/money";
import { withAdminMutation } from "@/lib/admin/guard";

const bodySchema = z.object({
  playerIds: z.array(z.string().uuid()).min(1),
  category: z.enum(["match_fee", "training", "league_subs", "kit", "fine", "social"]),
  description: z.string().trim().min(3).max(280),
  amount: z.string().min(1),
  dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(request: Request) {
  return withAdminMutation(request, async ({ admin, store }) => {
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return jsonError("Check the charge details and try again.");
    }
    const amountPence = parseGbpToPence(parsed.data.amount);
    if (!amountPence) return jsonError("Enter an amount in pounds, for example 8.00.");

    const players = await store.listPlayers();
    const allowed = new Set(
      players.filter((player) => player.status === "active").map((player) => player.id),
    );
    if (parsed.data.playerIds.some((id) => !allowed.has(id))) {
      return jsonError("One of those players is not an active squad member.");
    }

    const created = await store.createCharges({
      playerIds: parsed.data.playerIds,
      category: parsed.data.category,
      description: parsed.data.description,
      amountPence,
      dueOn: parsed.data.dueOn,
      createdBy: admin.playerId,
    });
    await store.recordAudit({
      actorId: admin.playerId,
      action: "create_charges",
      entityType: "charge",
      entityId: created[0]?.id ?? null,
      summary: `Posted ${created.length} ${parsed.data.category} charge(s)`,
    });
    return jsonOk({ ok: true, count: created.length });
  });
}
