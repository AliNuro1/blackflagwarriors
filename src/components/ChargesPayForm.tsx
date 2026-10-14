"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CHARGE_CATEGORY_LABEL, type Charge } from "@/lib/data/types";
import { formatDate, isOverdue } from "@/lib/dates";
import { formatGbp } from "@/lib/money";

export function ChargesPayForm({ charges }: { charges: Charge[] }) {
  const [selected, setSelected] = useState<string[]>(() => charges.map((charge) => charge.id));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const total = useMemo(
    () =>
      charges
        .filter((charge) => selected.includes(charge.id))
        .reduce((sum, charge) => sum + charge.amountPence, 0),
    [charges, selected],
  );

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function pay() {
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chargeIds: selected }),
      });
      const body = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !body.url) {
        setError(body.error ?? "Could not start payment.");
        return;
      }
      window.location.assign(body.url);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (charges.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-panel p-8 text-center">
        <p className="font-display text-xl uppercase tracking-wider text-paper">Nothing due</p>
        <p className="mt-2 text-sm text-fog">
          You are square with the club. New match fees land here after the treasurer posts them.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-line bg-panel">
        <ul className="divide-y divide-line">
          {charges.map((charge) => {
            const overdue = isOverdue(charge.dueOn);
            return (
              <li key={charge.id}>
                <label className="flex cursor-pointer items-start gap-3 px-4 py-4 hover:bg-white/3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-[#d4b45a]"
                    checked={selected.includes(charge.id)}
                    onChange={() => toggle(charge.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-paper">{charge.description}</span>
                      <Badge>{CHARGE_CATEGORY_LABEL[charge.category]}</Badge>
                      {overdue ? <Badge tone="warn">Overdue</Badge> : null}
                    </span>
                    <span className="mt-1 block text-sm text-mist">
                      Due {formatDate(charge.dueOn)}
                      {charge.remainingPence !== charge.amountPence
                        ? ` · ${formatGbp(charge.remainingPence)} left`
                        : ""}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold text-paper">
                    {formatGbp(charge.remainingPence)}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-100" role="alert">
          {error}
        </p>
      ) : null}
      <div className="sticky bottom-3 flex items-center justify-between gap-3 rounded-xl border border-gold/30 bg-ink/95 px-4 py-3 shadow-lg">
        <div>
          <p className="text-xs uppercase tracking-wider text-mist">Selected</p>
          <p className="font-display text-2xl text-gold">{formatGbp(total)}</p>
        </div>
        <Button type="button" onClick={pay} disabled={pending || selected.length === 0}>
          {pending ? "Opening checkout…" : "Pay by card"}
        </Button>
      </div>
    </div>
  );
}
