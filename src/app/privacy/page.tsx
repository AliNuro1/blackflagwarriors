import Link from "next/link";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <main id="main-content" className="mx-auto max-w-2xl px-4 py-12 text-sm leading-7 text-fog">
      <h1 className="font-display text-3xl uppercase tracking-wide text-paper">Privacy</h1>
      <p className="mt-4">
        Black Flag Warriors uses this portal only to collect player fees for Sunday football in
        Manchester. We hold your name, shirt number, UK mobile number, and payment records needed
        to show what you owe and what you have paid.
      </p>
      <p className="mt-3">
        Sign-in codes are sent by SMS. Card payments are processed by Stripe. We do not sell your
        data. Ask the treasurer if you want your number removed after you leave the squad.
      </p>
      <Link href="/" className="mt-6 inline-block text-gold hover:underline">
        Back to sign in
      </Link>
    </main>
  );
}
