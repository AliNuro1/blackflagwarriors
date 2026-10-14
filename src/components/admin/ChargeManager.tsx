"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import type { Charge, ChargeCategory, Player } from "@/lib/data/types";
import { CHARGE_CATEGORY_LABEL } from "@/lib/data/types";
import { formatGbp } from "@/lib/money";
import { formatDate } from "@/lib/dates";

const categories = Object.entries(CHARGE_CATEGORY_LABEL) as [ChargeCategory, string][];

export function ChargeRow({ charge, playerName }: { charge: Charge; playerName: string }) {
  const router = useRouter();
  const [description, setDescription] = useState(charge.description);
  const [category, setCategory] = useState<ChargeCategory>(charge.category);
  const [dueOn, setDueOn] = useState(charge.dueOn);
  const [amount, setAmount] = useState((charge.amountPence / 100).toFixed(2));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const lockedAmount = charge.amountPence !== charge.remainingPence;

  async function patch(body: Record<string, unknown>) {
    setError(null);
    setPending(true);
    try {
      const response = await fetch(`/api/admin/charges/${charge.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Could not update charge.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="rounded-xl border border-line bg-panel p-4">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <p className="font-medium text-paper">{charge.description}</p>
          <p className="text-sm text-mist">
            {playerName} · {CHARGE_CATEGORY_LABEL[charge.category]} · due {formatDate(charge.dueOn)} ·{" "}
            {charge.status}
          </p>
        </div>
        <p className="text-sm">
          {formatGbp(charge.remainingPence)} remaining of {formatGbp(charge.amountPence)}
        </p>
      </div>
      {charge.status !== "void" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Input value={description} onChange={(event) => setDescription(event.target.value)} aria-label="Description" />
          <Select value={category} onChange={(event) => setCategory(event.target.value as ChargeCategory)} aria-label="Category">
            {categories.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Input type="date" value={dueOn} onChange={(event) => setDueOn(event.target.value)} aria-label="Due date" />
          <Input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-label="Amount"
            disabled={lockedAmount}
          />
        </div>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm text-red-200" role="alert">
          {error}
        </p>
      ) : null}
      {charge.status !== "void" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() =>
              patch({
                description,
                category,
                dueOn,
                amount: lockedAmount ? undefined : amount,
              })
            }
          >
            Save
          </Button>
          <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => patch({ void: true })}>
            Void remaining
          </Button>
        </div>
      ) : null}
    </li>
  );
}

export function ChargeFilters({
  players,
  query,
}: {
  players: Player[];
  query: Record<string, string | undefined>;
}) {
  return (
    <form className="mt-6 grid gap-3 rounded-xl border border-line bg-panel p-4 sm:grid-cols-2 lg:grid-cols-5" method="get">
      <Select name="playerId" defaultValue={query.playerId ?? ""} aria-label="Player">
        <option value="">All players</option>
        {players.map((player) => (
          <option key={player.id} value={player.id}>
            {player.fullName}
          </option>
        ))}
      </Select>
      <Select name="category" defaultValue={query.category ?? ""} aria-label="Category">
        <option value="">All categories</option>
        {categories.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      <Select name="chargeStatus" defaultValue={query.chargeStatus ?? ""} aria-label="Status">
        <option value="">All statuses</option>
        <option value="open">Open</option>
        <option value="partial">Part paid</option>
        <option value="paid">Paid</option>
        <option value="void">Void</option>
      </Select>
      <Input type="date" name="from" defaultValue={query.from ?? ""} aria-label="From" />
      <Input type="date" name="to" defaultValue={query.to ?? ""} aria-label="To" />
      <Button type="submit" size="sm" className="sm:col-span-2 lg:col-span-5">
        Filter
      </Button>
    </form>
  );
}
