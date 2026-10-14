import { getStore } from "@/lib/data";
import { stripeConfigured } from "@/lib/env";
import { jsonError, jsonOk } from "@/lib/http";
import { PaymentAccessError, startPlayerCheckout } from "@/lib/payments/checkout";
import { createStripeGateway } from "@/lib/payments/stripe-gateway";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return jsonError("Sign in to pay.", 401);

  if (!stripeConfigured()) {
    return jsonError(
      "Stripe test keys are not configured on the server. Card checkout is not available.",
      503,
    );
  }

  const clientBody = await request.json().catch(() => null);

  try {
    const result = await startPlayerCheckout({
      session,
      store: getStore(),
      stripe: createStripeGateway(),
      clientBody,
    });
    return jsonOk({
      ok: true,
      url: result.url,
      amountPence: result.amountPence,
      testMode: result.testMode,
    });
  } catch (error) {
    if (error instanceof PaymentAccessError) {
      return jsonError(error.message, error.status);
    }
    console.error("[payments] checkout_failed", { playerId: session.playerId });
    return jsonError("We could not start card payment. Try again.", 502);
  }
}
