import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/http";
import { normalizeUkMobile } from "@/lib/phone";
import { withAdminMutation } from "@/lib/admin/guard";

const bodySchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().min(8),
  role: z.enum(["player", "admin"]).default("player"),
});

export async function POST(request: Request) {
  return withAdminMutation(request, async ({ admin, store }) => {
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return jsonError("Check the player details and try again.");
    const phone = normalizeUkMobile(parsed.data.phone);
    if (!phone.ok) return jsonError(phone.error);

    const player = await store.createPlayer({
      actorId: admin.playerId,
      fullName: parsed.data.fullName,
      phoneE164: phone.e164,
      role: parsed.data.role,
      status: "active",
    });
    await store.recordAudit({
      actorId: admin.playerId,
      action: "create_player",
      entityType: "player",
      entityId: player.id,
      summary: `Added ${player.fullName} as ${player.role}`,
    });
    return jsonOk({ ok: true, id: player.id });
  });
}
