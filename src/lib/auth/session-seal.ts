import { sealData, unsealData } from "iron-session";
import { sessionSecret } from "@/lib/env";

export const SESSION_COOKIE = "bfw_session";
export const PENDING_COOKIE = "bfw_pending";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;
export const PENDING_TTL_SECONDS = 60 * 10;

export interface SessionRecord {
  playerId: string;
  expiresAt: number;
}

export interface PendingRecord {
  phoneE164: string;
  expiresAt: number;
}

export async function sealSession(
  record: SessionRecord,
  password = sessionSecret(),
): Promise<string> {
  return sealData(record, { password, ttl: SESSION_TTL_SECONDS });
}

export async function unsealSession(
  token: string,
  options: { password?: string; now?: number } = {},
): Promise<SessionRecord | null> {
  try {
    const data = await unsealData<SessionRecord>(token, {
      password: options.password ?? sessionSecret(),
      ttl: SESSION_TTL_SECONDS,
    });
    if (!data?.playerId || typeof data.expiresAt !== "number") return null;
    const now = options.now ?? Date.now();
    if (data.expiresAt <= now) return null;
    return data;
  } catch {
    return null;
  }
}

export async function sealPending(
  record: PendingRecord,
  password = sessionSecret(),
): Promise<string> {
  return sealData(record, { password, ttl: PENDING_TTL_SECONDS });
}

export async function unsealPending(
  token: string,
  options: { password?: string; now?: number } = {},
): Promise<PendingRecord | null> {
  try {
    const data = await unsealData<PendingRecord>(token, {
      password: options.password ?? sessionSecret(),
      ttl: PENDING_TTL_SECONDS,
    });
    if (!data?.phoneE164 || typeof data.expiresAt !== "number") return null;
    const now = options.now ?? Date.now();
    if (data.expiresAt <= now) return null;
    return data;
  } catch {
    return null;
  }
}

export function newSessionRecord(
  playerId: string,
  now = Date.now(),
  ttlSeconds = SESSION_TTL_SECONDS,
): SessionRecord {
  return { playerId, expiresAt: now + ttlSeconds * 1000 };
}

export function newPendingRecord(phoneE164: string, now = Date.now()): PendingRecord {
  return { phoneE164, expiresAt: now + PENDING_TTL_SECONDS * 1000 };
}

export async function readSessionPlayerIdFromCookie(
  token: string | undefined,
): Promise<string | null> {
  if (!token) return null;
  const record = await unsealSession(token);
  return record?.playerId ?? null;
}
