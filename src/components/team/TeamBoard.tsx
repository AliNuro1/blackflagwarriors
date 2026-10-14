import type { ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { FaFeed } from "@/components/team/FaFeed";
import {
  FA_DIVISION_SEASON,
  FA_ORIGIN,
  FA_TABLE_LRCODE,
  FA_TEAM_LABEL,
  FA_FIXTURES_LRCODE,
  FA_RESULTS_LRCODE,
  faTeamUrl,
} from "@/lib/fulltime/config";

export function TeamBoard() {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-display text-xl uppercase tracking-wide text-paper">Upcoming fixtures</h2>
        <p className="mt-2 text-xs text-mist">Live from FA Full-Time for {FA_TEAM_LABEL}.</p>
        <div className="mt-4">
          <FaFeed
            code={FA_FIXTURES_LRCODE}
            fallbackHref={faTeamUrl()}
            fallbackLabel="open fixtures on FA Full-Time"
          />
        </div>
      </section>
      <section>
        <h2 className="font-display text-xl uppercase tracking-wide text-paper">Latest results</h2>
        <p className="mt-2 text-xs text-mist">Live from FA Full-Time. Updates when scores are posted.</p>
        <div className="mt-4">
          <FaFeed
            code={FA_RESULTS_LRCODE}
            fallbackHref={faTeamUrl()}
            fallbackLabel="open results on FA Full-Time"
          />
        </div>
      </section>
      <section>
        <h2 className="font-display text-xl uppercase tracking-wide text-paper">Division 2 table</h2>
        <p className="mt-2 text-xs text-mist">Live from FA Full-Time. Updates when the league table changes.</p>
        <div className="mt-4">
          <FaFeed
            code={FA_TABLE_LRCODE}
            fallbackHref={`${FA_ORIGIN}/index.html?divisionseason=${FA_DIVISION_SEASON}`}
            fallbackLabel="click here for Division 2"
          />
        </div>
      </section>
      <p className="text-xs leading-5 text-mist">
        Source: FA Full-Time, {FA_TEAM_LABEL}, Manchester Amateur Sunday Football League Division 2.
        Figures are as published by the league, not club fee records.
      </p>
    </div>
  );
}

export function TeamPageChrome({
  signedIn,
  children,
}: {
  signedIn: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href={signedIn ? "/account" : "/"} className="flex items-center gap-3">
            <BrandMark className="h-11 w-11" />
            <span>
              <span className="block font-display text-sm uppercase tracking-[0.18em] text-paper">
                Black Flag Warriors
              </span>
              <span className="block text-xs text-mist">Fixtures · results · table</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link className="px-2 py-2 text-gold sm:px-3" href="/team">
              Team
            </Link>
            {signedIn ? (
              <Link className="px-2 py-2 text-fog hover:text-paper sm:px-3" href="/account">
                My fees
              </Link>
            ) : (
              <Link className="px-2 py-2 text-fog hover:text-paper sm:px-3" href="/">
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
