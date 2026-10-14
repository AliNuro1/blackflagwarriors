"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import type { MembershipStatus, Player, PlayerBalance, UserRole } from "@/lib/data/types";
import { displayUkMobile } from "@/lib/phone";
import { formatGbp } from "@/lib/money";

export function CreatePlayerForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("player");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/admin/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone, role }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Could not add that player.");
        return;
      }
      setFullName("");
      setPhone("");
      setRole("player");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-line bg-panel p-5">
      <p className="font-display text-lg uppercase tracking-wider">Add player</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="fullName">Name</Label>
          <Input id="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
        </div>
        <div>
          <Label htmlFor="phone">UK mobile</Label>
          <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} required />
        </div>
        <div>
          <Label htmlFor="role">Role</Label>
          <Select id="role" value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
            <option value="player">Player</option>
            <option value="admin">Administrator</option>
          </Select>
        </div>
      </div>
      {error ? (
        <p className="text-sm text-red-200" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Add to squad"}
      </Button>
    </form>
  );
}

export function PlayerRow({
  player,
  balance,
}: {
  player: Player;
  balance: PlayerBalance | undefined;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(player.fullName);
  const [phone, setPhone] = useState(displayUkMobile(player.phoneE164));
  const [role, setRole] = useState<UserRole>(player.role);
  const [status, setStatus] = useState<MembershipStatus>(player.status);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    setError(null);
    setPending(true);
    try {
      const response = await fetch(`/api/admin/players/${player.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone, role, status }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Could not update player.");
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-paper">{player.fullName}</p>
          <p className="text-sm text-mist">
            {displayUkMobile(player.phoneE164)} · outstanding {formatGbp(balance?.openPence ?? 0)}
          </p>
        </div>
        <p className="text-xs uppercase tracking-wider text-mist">
          {player.role} · {player.status}
        </p>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input value={fullName} onChange={(event) => setFullName(event.target.value)} aria-label="Name" />
        <Input value={phone} onChange={(event) => setPhone(event.target.value)} aria-label="Mobile" />
        <Select value={role} onChange={(event) => setRole(event.target.value as UserRole)} aria-label="Role">
          <option value="player">Player</option>
          <option value="admin">Administrator</option>
        </Select>
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value as MembershipStatus)}
          aria-label="Status"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-red-200" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="mt-3" type="button" size="sm" disabled={pending} onClick={save}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </li>
  );
}
