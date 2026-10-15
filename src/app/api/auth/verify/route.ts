import { z } from "zod";
import { clientIp } from "@/lib/auth/client-ip";
import { confirmSignIn } from "@/lib/auth/sign-in";
import { createTwilioVerifyClient } from "@/lib/auth/twilio-verify";
import { getStore } from "@/lib/data";
import { getEnv, sessionSecret, twilioConfigured } from "@/lib/env";
import { jsonError, jsonOk } from "@/lib/http";
import { getPendingPhone, setSessionCookie } from "@/lib/session";

const bodySchema = z.object({
  code: z.string().min(1).max(12),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Enter the code from your text.");
  }
  if (getEnv().NODE_ENV === "production" && !twilioConfigured()) {
    return jsonError("Sign-in SMS is not configured on this server.", 503);
  }
  try {
    sessionSecret();
  } catch {
    return jsonError("Sign-in is not configured on this server (SESSION_SECRET).", 503);
  }

  try {
    const result = await confirmSignIn({
      code: parsed.data.code,
      pendingPhone: await getPendingPhone(),
      ip: clientIp(request),
      store: getStore(),
      twilio: createTwilioVerifyClient(),
    });

    if (result.status !== 200 || !("playerId" in result) || !result.playerId) {
      const message = "error" in result.body ? result.body.error : "That sign-in code did not work. Try again.";
      return jsonError(message, result.status);
    }

    await setSessionCookie(result.playerId);
    return jsonOk({ ok: true, redirectTo: "/account" });
  } catch (error) {
    console.error("auth/verify failed", error);
    return jsonError("Could not finish sign-in. Check Twilio and SESSION_SECRET on the server.", 500);
  }
}
