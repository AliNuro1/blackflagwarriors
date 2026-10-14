import Link from "next/link";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <main id="main-content" className="mx-auto max-w-2xl px-4 py-12 text-sm leading-7 text-fog">
      <h1 className="font-display text-3xl uppercase tracking-wide text-paper">Privacy</h1>
      <p className="mt-4">
        Black Flag Warriors (an amateur Sunday football club in Manchester) is the controller of
        personal data on this portal. We use it to identify squad members, record fees, and take
        card payments for club charges.
      </p>
      <h2 className="mt-6 font-display text-lg uppercase tracking-wide text-paper">What we hold</h2>
      <p className="mt-2">
        Name, UK mobile number, membership status, role (player or administrator), charges in pence,
        payment amounts and status, and Stripe Checkout Session / Payment Intent identifiers. We do
        not collect or store card numbers or CVCs. Sign-in codes are created and checked by Twilio
        Verify; we do not store the codes.
      </p>
      <h2 className="mt-6 font-display text-lg uppercase tracking-wide text-paper">Lawful basis</h2>
      <p className="mt-2">
        Processing is necessary to collect agreed club fees (contract / legitimate interests of
        running the squad). Recipients: this hosting provider, Supabase (database), Twilio (SMS
        codes), and Stripe (card checkout). Data stays in the UK/EEA or under the processor&apos;s
        documented transfer terms.
      </p>
      <h2 className="mt-6 font-display text-lg uppercase tracking-wide text-paper">Retention</h2>
      <p className="mt-2">
        Profiles stay while you are on the squad. After you leave, ask the treasurer to deactivate
        the account. Payment history is kept for accounting (typically up to six years) and is not
        deleted to alter an outstanding balance. You can ask for a copy, a correction, or restriction
        of processing. You may complain to the ICO (ico.org.uk).
      </p>
      <Link href="/" className="mt-6 inline-block text-gold hover:underline">
        Back to sign in
      </Link>
    </main>
  );
}
