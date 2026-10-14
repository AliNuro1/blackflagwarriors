import { z } from "zod";
import { getStore } from "@/lib/data";
import { jsonError, jsonOk } from "@/lib/http";
import { normalizeUkMobile } from "@/lib/phone";
import { takeToken } from "@/lib/rate-limit";
import { setPendingCookie } from "@/lib/session";
import { sendVerificationCode } from "@/lib/twilio";
import { usesMockAuth } from "@/lib/env";

const bodySchema = z.object({
  phone: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Enter the mobile number we have on the squad list.");
  }

  const phone = normalizeUkMobile(parsed.data.phone);
  if (!phone.ok) return jsonError(phone.error);

  if (!takeToken(`otp:${phone.e164}`, 5, 15 * 60 * 1000)) {
    return jsonError("Too many code requests. Wait 15 minutes and try again.", 429);
  }

  const player = await getStore().getPlayerByPhone(phone.e164);
    if (!player) {
    return jsonError(
      "That number is not on the Black Flag Warriors squad list. Ask an admin to add you.",
      404,
    );
  }

  try {
    await sendVerificationCode(phone.e164);
  } catch (error) {
    console.error("Twilio Verify send failed", error);
    return jsonError("We could not send a text right now. Try again in a minute.", 502);
  }

  await setPendingCookie(phone.e164);
  return jsonOk({
    ok: true,
    mock: usesMockAuth(),
  });
}
