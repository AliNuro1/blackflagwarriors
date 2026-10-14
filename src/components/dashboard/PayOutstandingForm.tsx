"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatGbp } from "@/lib/money";

export function PayOutstandingForm({
  outstandingPence,
  itemCount,
}: {
  outstandingPence: number;
  itemCount: number;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const response = await fetch("/api/pay", { method: "POST" });
      const body = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setError(body.error ?? "Could not start payment.");
        return;
      }
      setMessage(body.message ?? "Payment is not available in this build.");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 rounded-xl border border-line bg-ink p-5"
      aria-labelledby="pay-heading"
    >
      <h2 id="pay-heading" className="font-display text-lg uppercase tracking-wider">
        Pay
      </h2>
      <p className="mt-1 text-sm text-fog">
        {itemCount} item{itemCount === 1 ? "" : "s"} · {formatGbp(outstandingPence)} from club
        records. The amount is calculated on the server in pence; this form does not send a total.
      </p>
      <p className="mt-2 text-xs text-mist">
        Card checkout is not enabled in this build (Stripe is not implemented here).
      </p>
      {error ? (
        <p className="mt-3 rounded-md border border-paper/30 bg-panel px-3 py-2 text-sm text-paper" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 rounded-md border border-line bg-panel px-3 py-2 text-sm text-fog" role="status">
          {message}
        </p>
      ) : null}
      <Button type="submit" className="mt-4 w-full sm:w-auto" disabled={pending || outstandingPence <= 0}>
        {pending ? "Checking club records…" : `Pay ${formatGbp(outstandingPence)}`}
      </Button>
    </form>
  );
}
