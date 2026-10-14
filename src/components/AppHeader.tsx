import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import type { SessionPayload } from "@/lib/session";
import { Button } from "@/components/ui/button";

export function AppHeader({ session }: { session: SessionPayload }) {
  return (
    <header className="border-b border-line bg-ink/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/account" className="flex items-center gap-3">
          <BrandMark className="h-9 w-9" />
          <span>
            <span className="block font-display text-sm uppercase tracking-[0.18em] text-paper">
              Black Flag Warriors
            </span>
            <span className="block text-xs text-mist">Player payments</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link className="hidden px-3 py-2 text-fog hover:text-paper sm:inline" href="/account">
            My fees
          </Link>
          <Link className="hidden px-3 py-2 text-fog hover:text-paper sm:inline" href="/account/history">
            History
          </Link>
          {session.role === "admin" ? (
            <Link className="px-3 py-2 text-gold hover:text-gold-light" href="/admin">
              Admin
            </Link>
          ) : null}
          <form action="/api/auth/logout" method="post">
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </nav>
      </div>
    </header>
  );
}
