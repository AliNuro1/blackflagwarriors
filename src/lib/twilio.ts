import { getEnv, usesMockAuth } from "@/lib/env";
import { DEMO_OTP } from "@/lib/data/seed";

export async function sendVerificationCode(phoneE164: string): Promise<void> {
  if (usesMockAuth()) return;

  const env = getEnv();
  const twilio = await import("twilio");
  const client = twilio.default(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  await client.verify.v2
    .services(env.TWILIO_VERIFY_SERVICE_SID!)
    .verifications.create({ to: phoneE164, channel: "sms" });
}

export async function checkVerificationCode(
  phoneE164: string,
  code: string,
): Promise<boolean> {
  const cleaned = code.replace(/\s/g, "");
  if (usesMockAuth()) {
    return cleaned === DEMO_OTP;
  }

  const env = getEnv();
  const twilio = await import("twilio");
  const client = twilio.default(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  const result = await client.verify.v2
    .services(env.TWILIO_VERIFY_SERVICE_SID!)
    .verificationChecks.create({ to: phoneE164, code: cleaned });
  return result.status === "approved";
}
