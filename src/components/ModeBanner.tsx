import { isDevMockAuth, usesMockData, usesMockPayments } from "@/lib/env";

export function ModeBanner() {
  const notes: string[] = [];
  if (usesMockData()) notes.push("squad data is in-memory");
  if (isDevMockAuth()) {
    notes.push(
      "DEVELOPMENT-ONLY mock: Twilio Verify is not sending real SMS (code 000000). This path is disabled in production",
    );
  }
  if (usesMockPayments()) notes.push("card payments are mocked");
  if (notes.length === 0) return null;

  return (
    <p className="border-b border-line bg-gold/10 px-4 py-2 text-center text-xs text-gold">
      {notes.join(". ")}.
    </p>
  );
}
