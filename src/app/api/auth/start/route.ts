import { z } from "zod";
import { clientIp } from "@/lib/auth/client-ip";
import { startSignIn } from "@/lib/auth/sign-in";
import { createTwilioVerifyClient } from "@/lib/auth/twilio-verify";
import { getStore } from "@/lib/data";
import { getEnv, sessionSecret, twilioConfigured } from "@/lib/env";
import { jsonError, jsonOk } from "@/lib/http";
import { setPendingCookie } from "@/lib/session";

const bodySchema = z.object({
  phone: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Enter a UK mobile number, for example 07700 900101.");
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
    const result = await startSignIn({
      phone: parsed.data.phone,
      ip: clientIp(request),
      store: getStore(),
      twilio: createTwilioVerifyClient(),
    });

    if (result.status !== 200) {
      return jsonError(result.body.error, result.status);
    }

    await setPendingCookie(result.pendingPhone);
    return jsonOk(result.body);
  } catch (error) {
    console.error("auth/start failed", error);
    return jsonError("Could not start sign-in. Check Twilio and SESSION_SECRET on the server.", 500);
  }
}
