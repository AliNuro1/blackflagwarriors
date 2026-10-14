import twilio from "twilio";
import { getEnv, isDevMockAuth } from "@/lib/env";

export interface TwilioVerifyClient {
  sendSms(toE164: string): Promise<void>;
  checkCode(toE164: string, code: string): Promise<boolean>;
}

const DEV_MOCK_CODE = "000000";

function assertNoPublicTwilio(): void {
  if (process.env.NEXT_PUBLIC_TWILIO_ACCOUNT_SID || process.env.NEXT_PUBLIC_TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio credentials must never use the NEXT_PUBLIC_ prefix.");
  }
}

export function createTwilioVerifyClient(): TwilioVerifyClient {
  assertNoPublicTwilio();
  const env = getEnv();

  if (env.NODE_ENV === "production" && isDevMockAuth(env)) {
    throw new Error("Development mock authentication cannot run in production.");
  }

  if (isDevMockAuth(env)) {
    return {
      async sendSms() {
        return;
      },
      async checkCode(_toE164, code) {
        return code.replace(/\s/g, "") === DEV_MOCK_CODE;
      },
    };
  }

  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_VERIFY_SERVICE_SID) {
    throw new Error("Twilio Verify is not configured.");
  }

  const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  const serviceSid = env.TWILIO_VERIFY_SERVICE_SID;

  return {
    async sendSms(toE164: string) {
      await client.verify.v2.services(serviceSid).verifications.create({
        to: toE164,
        channel: "sms",
      });
    },
    async checkCode(toE164: string, code: string) {
      const result = await client.verify.v2.services(serviceSid).verificationChecks.create({
        to: toE164,
        code: code.replace(/\s/g, ""),
      });
      return result.status === "approved";
    },
  };
}
