import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/http";
import { parseGbpToPence } from "@/lib/money";
import { withAdminMutation } from "@/lib/admin/guard";

const bodySchema = z.object({
  description: z.string().trim().min(3).max(280).optional(),
  category: z.enum(["match_fee", "training", "league_subs", "kit", "fine", "social"]).optional(),
  dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amount: z.string().min(1).optional(),
  void: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ chargeId: string }> },
) {
  return withAdminMutation(request, async ({ admin, store }) => {
    const { chargeId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(chargeId)) return jsonError("Charge not found.", 404);
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return jsonError("Check the charge details and try again.");

    if (parsed.data.void) {
      const charge = await store.voidCharge({ actorId: admin.playerId, chargeId });
      await store.recordAudit({
        actorId: admin.playerId,
        action: "void_charge",
        entityType: "charge",
        entityId: charge.id,
        summary: `Voided charge ${charge.description}`,
      });
      return jsonOk({ ok: true, id: charge.id, status: charge.status });
    }

    let amountPence: number | undefined;
    if (parsed.data.amount) {
      const parsedAmount = parseGbpToPence(parsed.data.amount);
      if (!parsedAmount) return jsonError("Enter an amount in pounds, for example 8.00.");
      amountPence = parsedAmount;
    }

    const charge = await store.updateCharge({
      actorId: admin.playerId,
      chargeId,
      description: parsed.data.description,
      category: parsed.data.category,
      dueOn: parsed.data.dueOn,
      amountPence,
    });
    await store.recordAudit({
      actorId: admin.playerId,
      action: "update_charge",
      entityType: "charge",
      entityId: charge.id,
      summary: `Updated charge ${charge.description}`,
    });
    return jsonOk({ ok: true, id: charge.id });
  });
}
