"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { displayUkMobile } from "@/lib/phone";

export function PhoneLoginForm({
  demoPlayer,
  demoTreasurer,
  mockAuth,
}: {
  demoPlayer: string;
  demoTreasurer: string;
  mockAuth: boolean;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState(mockAuth ? displayUkMobile(demoPlayer) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/auth/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Could not send a code.");
        return;
      }
      router.push("/verify");
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="phone">UK mobile number</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="07700 900101"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          required
        />
      </div>
      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-100" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending code…" : "Text me a sign-in code"}
      </Button>
      {mockAuth ? (
        <div className="rounded-md border border-line bg-panel px-3 py-3 text-xs leading-5 text-fog">
          <p className="font-semibold uppercase tracking-wider text-gold">Preview logins</p>
          <p className="mt-1">
            Player: {displayUkMobile(demoPlayer)} · Admin: {displayUkMobile(demoTreasurer)}
          </p>
          <p>One-time code: 000000</p>
        </div>
      ) : null}
    </form>
  );
}
