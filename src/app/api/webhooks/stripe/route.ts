import { getStore } from "@/lib/data";
import { getEnv } from "@/lib/env";
import { jsonError, jsonOk } from "@/lib/http";
import { createStripeGateway } from "@/lib/payments/stripe-gateway";
import { processSignedStripeWebhook, WebhookSignatureError } from "@/lib/payments/webhooks";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const env = getEnv();
  if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY) {
    return jsonError("Stripe webhook secret is not configured.", 503);
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  try {
    const result = await processSignedStripeWebhook({
      rawBody,
      signature,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
      stripe: createStripeGateway(),
      store: getStore(),
    });
    return jsonOk(result);
  } catch (error) {
    if (error instanceof WebhookSignatureError) {
      console.info("[payments] webhook_signature_rejected");
      return jsonError("Invalid webhook signature.", 400);
    }
    console.error("[payments] webhook_failed");
    return jsonError("Webhook handling failed.", 500);
  }
}
