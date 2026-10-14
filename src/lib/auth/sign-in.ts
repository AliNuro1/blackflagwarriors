import type { ClubStore } from "@/lib/data";
import { sessionSecret } from "@/lib/env";
import {
  SENDS_PER_IP_PER_DAY,
  SENDS_PER_PHONE_PER_DAY,
  SEND_DAY_MS,
  START_COOLDOWN_MS,
  START_PER_IP,
  START_PER_PHONE,
  START_WINDOW_MS,
  VERIFY_PER_IP,
  VERIFY_PER_PHONE,
  VERIFY_WINDOW_MS,
  consume,
  hashSensitive,
} from "@/lib/auth/limits";
import { normalizeUkMobile } from "@/lib/phone";
import type { TwilioVerifyClient } from "@/lib/auth/twilio-verify";

export const GENERIC_START_OK = {
  ok: true as const,
  message: "If that number is on the squad list, we have sent a text with a sign-in code.",
};

export const GENERIC_CODE_ERROR = "That sign-in code did not work. Try again.";
export const GENERIC_RATE_ERROR = "Too many attempts. Try again later.";
export const GENERIC_PHONE_ERROR = "Enter a UK mobile number, for example 07700 900101.";
export const GENERIC_PENDING_ERROR = "Your sign-in expired. Start again with your mobile number.";

export type StartResult =
  | { status: 200; body: typeof GENERIC_START_OK; pendingPhone: string }
  | { status: 400 | 429; body: { error: string }; pendingPhone?: undefined };

export type VerifyResult =
  | { status: 200; body: { ok: true }; playerId: string }
  | { status: 400 | 401 | 429; body: { error: string }; playerId?: undefined };

function eligible(player: { status: string } | null): boolean {
  return player?.status === "active";
}

export async function startSignIn(input: {
  phone: string;
  ip: string;
  store: ClubStore;
  twilio: TwilioVerifyClient;
  now?: number;
}): Promise<StartResult> {
  const now = input.now ?? Date.now();
  const phone = normalizeUkMobile(input.phone);
  if (!phone.ok) {
    return { status: 400, body: { error: GENERIC_PHONE_ERROR } };
  }

  const secret = sessionSecret();
  const phoneKey = hashSensitive(phone.e164, secret);
  const ipKey = hashSensitive(input.ip, secret);

  const phoneLimit = consume(`start-phone:${phoneKey}`, {
    limit: START_PER_PHONE,
    windowMs: START_WINDOW_MS,
    cooldownMs: START_COOLDOWN_MS,
    now,
  });
  const ipLimit = consume(`start-ip:${ipKey}`, {
    limit: START_PER_IP,
    windowMs: START_WINDOW_MS,
    now,
  });
  if (phoneLimit !== "ok" || ipLimit !== "ok") {
    return { status: 429, body: { error: GENERIC_RATE_ERROR } };
  }

  const player = await input.store.getPlayerByPhone(phone.e164);
  if (eligible(player)) {
    const sendPhone = consume(`send-phone:${phoneKey}`, {
      limit: SENDS_PER_PHONE_PER_DAY,
      windowMs: SEND_DAY_MS,
      now,
    });
    const sendIp = consume(`send-ip:${ipKey}`, {
      limit: SENDS_PER_IP_PER_DAY,
      windowMs: SEND_DAY_MS,
      now,
    });
    if (sendPhone === "ok" && sendIp === "ok") {
      try {
        await input.twilio.sendSms(phone.e164);
      } catch {
        console.error("Twilio Verify send failed");
      }
    }
  }

  return { status: 200, body: GENERIC_START_OK, pendingPhone: phone.e164 };
}

export async function confirmSignIn(input: {
  code: string;
  pendingPhone: string | null;
  ip: string;
  store: ClubStore;
  twilio: TwilioVerifyClient;
  now?: number;
}): Promise<VerifyResult> {
  if (!input.pendingPhone) {
    return { status: 401, body: { error: GENERIC_PENDING_ERROR } };
  }

  const code = input.code.replace(/\s/g, "");
  if (!/^\d{4,8}$/.test(code)) {
    return { status: 400, body: { error: GENERIC_CODE_ERROR } };
  }

  const secret = sessionSecret();
  const phoneKey = hashSensitive(input.pendingPhone, secret);
  const ipKey = hashSensitive(input.ip, secret);
  const now = input.now ?? Date.now();

  const phoneLimit = consume(`verify-phone:${phoneKey}`, {
    limit: VERIFY_PER_PHONE,
    windowMs: VERIFY_WINDOW_MS,
    now,
  });
  const ipLimit = consume(`verify-ip:${ipKey}`, {
    limit: VERIFY_PER_IP,
    windowMs: VERIFY_WINDOW_MS,
    now,
  });
  if (phoneLimit !== "ok" || ipLimit !== "ok") {
    return { status: 429, body: { error: GENERIC_RATE_ERROR } };
  }

  let approved = false;
  try {
    approved = await input.twilio.checkCode(input.pendingPhone, code);
  } catch {
    console.error("Twilio Verify check failed");
    return { status: 400, body: { error: GENERIC_CODE_ERROR } };
  }

  if (!approved) {
    return { status: 400, body: { error: GENERIC_CODE_ERROR } };
  }

  const player = await input.store.getPlayerByPhone(input.pendingPhone);
  if (!eligible(player) || !player) {
    return { status: 400, body: { error: GENERIC_CODE_ERROR } };
  }

  return { status: 200, body: { ok: true }, playerId: player.id };
}
