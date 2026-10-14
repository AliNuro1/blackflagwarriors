import { getStore } from "@/lib/data";
import { jsonError } from "@/lib/http";
import { getSession } from "@/lib/session";
import { AdminAccessError, requireAdmin } from "@/lib/admin/access";
import { CsrfError, assertSameOrigin } from "@/lib/csrf";
import type { SessionPayload } from "@/lib/auth/session";
import type { ClubStore } from "@/lib/data/types";

export async function withAdminMutation(
  request: Request,
  fn: (ctx: { admin: SessionPayload; store: ClubStore }) => Promise<Response>,
): Promise<Response> {
  try {
    assertSameOrigin(request);
    const store = getStore();
    const admin = await requireAdmin(await getSession(), store);
    return await fn({ admin, store });
  } catch (error) {
    if (error instanceof CsrfError) {
      return jsonError(error.message, 403);
    }
    if (error instanceof AdminAccessError) {
      return jsonError(error.message, error.status);
    }
    console.error("[admin] mutation_failed");
    return jsonError("Could not save that change.", 400);
  }
}

export async function withAdminRead(
  fn: (ctx: { admin: SessionPayload; store: ClubStore }) => Promise<Response>,
): Promise<Response> {
  try {
    const store = getStore();
    const admin = await requireAdmin(await getSession(), store);
    return await fn({ admin, store });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return jsonError(error.message, error.status);
    }
    throw error;
  }
}
