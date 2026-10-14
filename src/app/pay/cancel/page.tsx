import Link from "next/link";

export const metadata = { title: "Payment cancelled" };

export default function PayCancelPage() {
  return (
    <main id="main-content" className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4">
      <div className="rounded-2xl border border-line bg-ink p-8 text-center">
        <p className="font-display text-3xl uppercase tracking-wide text-paper">Not taken</p>
        <p className="mt-3 text-sm text-fog">
          The card payment was cancelled. Nothing has been charged. Your fees are still open.
        </p>
        <Link
          href="/account"
          className="mt-6 inline-flex h-11 items-center rounded-md bg-gold px-4 text-sm font-semibold text-ink"
        >
          Return to fees
        </Link>
      </div>
    </main>
  );
}
