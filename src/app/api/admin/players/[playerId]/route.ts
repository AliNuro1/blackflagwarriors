import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/http";
import { normalizeUkMobile } from "@/lib/phone";
import { withAdminMutation } from "@/lib/admin/guard";

const bodySchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().min(8).optional(),
  role: z.enum(["player", "admin"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ playerId: string }> },
) {
  return withAdminMutation(request, async ({ admin, store }) => {
    const { playerId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(playerId)) return jsonError("Player not found.", 404);
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return jsonError("Check the player details and try again.");

    let phoneE164: string | undefined;
    if (parsed.data.phone) {
      const phone = normalizeUkMobile(parsed.data.phone);
      if (!phone.ok) return jsonError(phone.error);
      phoneE164 = phone.e164;
    }

    const player = await store.updatePlayer({
      actorId: admin.playerId,
      playerId,
      fullName: parsed.data.fullName,
      phoneE164,
      role: parsed.data.role,
      status: parsed.data.status,
    });
    await store.recordAudit({
      actorId: admin.playerId,
      action: "update_player",
      entityType: "player",
      entityId: player.id,
      summary: `Updated ${player.fullName} (${player.role}, ${player.status})`,
    });
    return jsonOk({ ok: true, id: player.id });
  });
}
