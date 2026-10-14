import { getEnv, isDevMockAuth, twilioConfigured, usesMockData, usesMockPayments } from "@/lib/env";
import { stripeMode } from "@/lib/payments/stripe-gateway";

export function ModeBanner() {
  const env = getEnv();
  const notes: string[] = [];
  if (usesMockData(env)) notes.push("squad data is in-memory");
  if (env.NODE_ENV === "production" && !twilioConfigured(env)) {
    notes.push("Twilio Verify is not configured — player sign-in cannot send SMS");
  }
  if (isDevMockAuth(env)) {
    notes.push(
      "DEVELOPMENT-ONLY mock: Twilio Verify is not sending real SMS (code 000000). This path is disabled in production",
    );
  }
  if (usesMockPayments(env)) {
    notes.push("Stripe Checkout is not configured (test keys missing)");
  } else if (stripeMode() === "test") {
    notes.push("Stripe test mode — not live club card payments");
  } else if (stripeMode() === "live") {
    notes.push(
      "Stripe live keys are present. Treat card payments as live only after webhook delivery has been tested",
    );
  }
  if (notes.length === 0) return null;

  return (
    <p className="border-b border-line bg-gold/10 px-4 py-2 text-center text-xs text-gold">
      {notes.join(". ")}.
    </p>
  );
}
