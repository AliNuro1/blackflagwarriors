import { z } from "zod";
import { getStore } from "@/lib/data";
import { jsonError, jsonOk } from "@/lib/http";
import { getPendingPhone, setSessionCookie } from "@/lib/session";
import { checkVerificationCode } from "@/lib/twilio";
import { takeToken } from "@/lib/rate-limit";

const bodySchema = z.object({
  code: z.string().min(4).max(8),
});

export async function POST(request: Request) {
  const pendingPhone = await getPendingPhone();
  if (!pendingPhone) {
    return jsonError("Your sign-in expired. Start again with your mobile number.", 401);
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Enter the 6-digit code from your text.");
  }

  if (!takeToken(`otp-check:${pendingPhone}`, 8, 15 * 60 * 1000)) {
    return jsonError("Too many attempts. Request a new code.", 429);
  }

  let approved = false;
  try {
    approved = await checkVerificationCode(pendingPhone, parsed.data.code);
  } catch (error) {
    console.error("Twilio Verify check failed", error);
    return jsonError("We could not check that code. Try again.", 502);
  }

  if (!approved) {
    return jsonError("That code is not valid. Check the text and try again.");
  }

  const player = await getStore().getPlayerByPhone(pendingPhone);
    if (!player) {
    return jsonError("That number is no longer on the squad list.", 403);
  }

  await setSessionCookie(player);
  return jsonOk({ ok: true, role: player.role });
}
