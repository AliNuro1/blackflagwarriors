import { usesMockAuth, usesMockData, usesMockPayments } from "@/lib/env";

export function ModeBanner() {
  const mocks: string[] = [];
  if (usesMockData()) mocks.push("squad data");
  if (usesMockAuth()) mocks.push("SMS codes");
  if (usesMockPayments()) mocks.push("card payments");
  if (mocks.length === 0) return null;

  return (
    <p className="border-b border-line bg-gold/10 px-4 py-2 text-center text-xs text-gold">
      Local preview: {mocks.join(", ")} are mocked until Supabase, Twilio Verify, and Stripe
      keys are set. Demo code is 000000.
    </p>
  );
}
