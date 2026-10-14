import { cookies } from "next/headers";
import { getStore } from "@/lib/data";
import type { Player } from "@/lib/data/types";
import {
  PENDING_COOKIE,
  PENDING_TTL_SECONDS,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  newPendingRecord,
  newSessionRecord,
  sealPending,
  sealSession,
  unsealPending,
  unsealSession,
} from "@/lib/auth/session-seal";

export {
  PENDING_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  newSessionRecord,
  readSessionPlayerIdFromCookie,
  sealSession,
  unsealSession,
} from "@/lib/auth/session-seal";

export interface SessionPayload {
  playerId: string;
  phoneE164: string;
  fullName: string;
  role: Player["role"];
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
  };
}

export async function setSessionCookie(playerId: string): Promise<void> {
  const store = await cookies();
  store.set(
    SESSION_COOKIE,
    await sealSession(newSessionRecord(playerId)),
    cookieOptions(SESSION_TTL_SECONDS),
  );
  store.delete(PENDING_COOKIE);
}

export async function setPendingCookie(phoneE164: string): Promise<void> {
  const store = await cookies();
  store.set(
    PENDING_COOKIE,
    await sealPending(newPendingRecord(phoneE164)),
    cookieOptions(PENDING_TTL_SECONDS),
  );
}

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(PENDING_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const record = await unsealSession(token);
  if (!record) return null;
  const player = await getStore().getPlayerById(record.playerId);
  if (!player || player.status !== "active") return null;
  return {
    playerId: player.id,
    phoneE164: player.phoneE164,
    fullName: player.fullName,
    role: player.role,
  };
}

export async function getPendingPhone(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(PENDING_COOKIE)?.value;
  if (!token) return null;
  const pending = await unsealPending(token);
  return pending?.phoneE164 ?? null;
}
