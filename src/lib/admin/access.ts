import type { SessionPayload } from "@/lib/auth/session";
import { CsrfError, assertSameOrigin } from "@/lib/csrf";
import type { ClubStore } from "@/lib/data/types";

export { assertSameOrigin, CsrfError };

export class AdminAccessError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AdminAccessError";
  }
}

export async function requireAdmin(
  session: SessionPayload | null,
  store: ClubStore,
): Promise<SessionPayload> {
  if (!session) {
    throw new AdminAccessError(401, "Sign in required.");
  }
  const player = await store.getPlayerById(session.playerId);
  if (!player || player.status !== "active") {
    throw new AdminAccessError(401, "Sign in required.");
  }
  if (player.role !== "admin") {
    throw new AdminAccessError(403, "Admin access only.");
  }
  return {
    playerId: player.id,
    phoneE164: player.phoneE164,
    fullName: player.fullName,
    role: "admin",
  };
}

