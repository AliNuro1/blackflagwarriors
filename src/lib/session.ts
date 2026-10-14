import { cookies } from "next/headers";
import type { Player } from "@/lib/data/types";
import {
  PENDING_COOKIE,
  SESSION_COOKIE,
  createPendingToken,
  createSessionToken,
  readPendingToken,
  readSessionToken,
  type SessionPayload,
} from "@/lib/auth-token";

export {
  PENDING_COOKIE,
  SESSION_COOKIE,
  readSessionToken,
  type SessionPayload,
} from "@/lib/auth-token";

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

export async function setSessionCookie(player: Player): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(player), {
    ...cookieBase,
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function setPendingCookie(phoneE164: string): Promise<void> {
  const store = await cookies();
  store.set(PENDING_COOKIE, await createPendingToken(phoneE164), {
    ...cookieBase,
    maxAge: 60 * 10,
  });
}

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(PENDING_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return readSessionToken(token);
}

export async function getPendingPhone(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(PENDING_COOKIE)?.value;
  if (!token) return null;
  const pending = await readPendingToken(token);
  return pending?.phoneE164 ?? null;
}
