"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import type { ChargeCategory, Player } from "@/lib/data/types";
import { CHARGE_CATEGORY_LABEL } from "@/lib/data/types";

const categories = Object.entries(CHARGE_CATEGORY_LABEL) as [ChargeCategory, string][];

export function IssueChargeForm({ players }: { players: Player[] }) {
  const router = useRouter();
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [category, setCategory] = useState<ChargeCategory>("match_fee");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("8.00");
  const [dueOn, setDueOn] = useState("2026-10-18");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function togglePlayer(id: string) {
    setPlayerIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setOk(null);
    setPending(true);
    try {
      const response = await fetch("/api/admin/charges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerIds,
          category,
          description,
          amount,
          dueOn,
        }),
      });
      const body = (await response.json()) as { error?: string; count?: number };
      if (!response.ok) {
        setError(body.error ?? "Could not post those fees.");
        return;
      }
      setOk(`Posted to ${body.count} player${body.count === 1 ? "" : "s"}.`);
      setPlayerIds([]);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-line bg-panel p-5">
      <div>
        <p className="font-display text-lg uppercase tracking-wider text-paper">Post a fee</p>
        <p className="mt-1 text-sm text-mist">
          Match fees, training, kit, and fines land on each selected player&apos;s account.
        </p>
      </div>
      <div>
        <Label>Players</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setPlayerIds(players.map((player) => player.id))}
          >
            Whole squad
          </Button>
          {players.map((player) => (
            <button
              key={player.id}
              type="button"
              onClick={() => togglePlayer(player.id)}
              className={`rounded-full border px-3 py-1 text-xs ${
                playerIds.includes(player.id)
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-line text-fog"
              }`}
            >
              {player.fullName}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            id="category"
            value={category}
            onChange={(event) => setCategory(event.target.value as ChargeCategory)}
          >
            {categories.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="amount">Amount (£)</Label>
          <Input
            id="amount"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            placeholder="Match fee · vs Moston Brook"
            onChange={(event) => setDescription(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="dueOn">Due</Label>
          <Input
            id="dueOn"
            type="date"
            value={dueOn}
            onChange={(event) => setDueOn(event.target.value)}
            required
          />
        </div>
      </div>
      {error ? (
        <p className="text-sm text-red-200" role="alert">
          {error}
        </p>
      ) : null}
      {ok ? <p className="text-sm text-emerald-200">{ok}</p> : null}
      <Button type="submit" disabled={pending || playerIds.length === 0}>
        {pending ? "Posting…" : "Post fee"}
      </Button>
    </form>
  );
}
