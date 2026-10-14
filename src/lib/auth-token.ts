import { jwtVerify, SignJWT } from "jose";
import type { Player, UserRole } from "@/lib/data/types";

export const SESSION_COOKIE = "bfw_session";
export const PENDING_COOKIE = "bfw_pending";

export interface SessionPayload {
  playerId: string;
  phoneE164: string;
  fullName: string;
  role: UserRole;
}

export interface PendingPayload {
  phoneE164: string;
}

function secretKey(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET ||
    (process.env.NODE_ENV === "production"
      ? ""
      : "black-flag-warriors-local-session-secret");
  if (!secret) {
    throw new Error("SESSION_SECRET is required in production");
  }
  return new TextEncoder().encode(secret);
}

async function sign(payload: Record<string, string>, expires: string): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(secretKey());
}

export async function createSessionToken(player: Player): Promise<string> {
  return sign(
    {
      playerId: player.id,
      phoneE164: player.phoneE164,
      fullName: player.fullName,
      role: player.role,
    },
    "14d",
  );
}

export async function createPendingToken(phoneE164: string): Promise<string> {
  return sign({ phoneE164 }, "10m");
}

export async function readSessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (
      typeof payload.playerId !== "string" ||
      typeof payload.phoneE164 !== "string" ||
      typeof payload.fullName !== "string" ||
      (payload.role !== "player" && payload.role !== "admin")
    ) {
      return null;
    }
    return {
      playerId: payload.playerId,
      phoneE164: payload.phoneE164,
      fullName: payload.fullName,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export async function readPendingToken(token: string): Promise<PendingPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.phoneE164 !== "string") return null;
    return { phoneE164: payload.phoneE164 };
  } catch {
    return null;
  }
}
