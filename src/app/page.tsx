import { BrandMark } from "@/components/BrandMark";
import { PhoneLoginForm } from "@/components/PhoneLoginForm";
import { DEMO_ADMIN_PHONE, DEMO_PLAYER_PHONE } from "@/lib/data/seed";
import { usesMockAuth } from "@/lib/env";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <main id="main-content" className="rounded-2xl border border-line bg-ink p-6 shadow-2xl sm:p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark className="h-28 w-28" priority />
          <p className="mt-4 font-display text-2xl uppercase tracking-[0.16em] text-paper">
            Black Flag Warriors
          </p>
          <p className="text-sm text-mist">Sunday football · Manchester</p>
        </div>
        <h1 className="font-display text-3xl uppercase tracking-wide text-gold">Player payments</h1>
        <p className="mt-3 text-sm leading-6 text-fog">
          Enter the UK mobile number on the squad list. If it matches an active player, we text a
          one-time code. We will not tell you whether the number is registered.
        </p>
        <div className="mt-8">
          <PhoneLoginForm
            demoPlayer={DEMO_PLAYER_PHONE}
            demoTreasurer={DEMO_ADMIN_PHONE}
            mockAuth={usesMockAuth()}
          />
        </div>
        <p className="mt-6 text-xs leading-5 text-mist">
          Match fees are due by 9pm the Thursday before kick-off. Card payments are taken in
          sterling via Stripe. We store your number only to identify you on the squad list.{" "}
          <Link href="/team" className="text-gold underline-offset-2 hover:underline">
            Fixtures
          </Link>
          {" · "}
          <Link href="/privacy" className="text-gold underline-offset-2 hover:underline">
            Privacy
          </Link>
        </p>
      </main>
    </div>
  );
}
