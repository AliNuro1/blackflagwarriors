import Link from "next/link";
import { getStore } from "@/lib/data";
import { getSession } from "@/lib/session";
import { fulfillStripeSession } from "@/lib/stripe";
import { redirect } from "next/navigation";

export const metadata = { title: "Payment received" };

export default async function PaySuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ mock?: string; payment_id?: string; session_id?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");
  const params = await searchParams;
  const store = getStore();

  if (params.mock === "1" && params.payment_id) {
    await store.completePayment({ paymentId: params.payment_id });
  } else if (params.session_id) {
    await fulfillStripeSession(params.session_id);
  }

  return (
    <main id="main-content" className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4">
      <div className="rounded-2xl border border-line bg-ink p-8 text-center">
        <p className="font-display text-3xl uppercase tracking-wide text-gold">Paid</p>
        <p className="mt-3 text-sm text-fog">
          Thanks. Your card payment is recorded against your Black Flag Warriors fees.
        </p>
        <Link
          href="/account"
          className="mt-6 inline-flex h-11 items-center rounded-md bg-gold px-4 text-sm font-semibold text-ink"
        >
          Back to my fees
        </Link>
      </div>
    </main>
  );
}
