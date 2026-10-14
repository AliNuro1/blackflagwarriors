import Link from "next/link";
import { getStore } from "@/lib/data";
import { describeReturnPage } from "@/lib/payments/checkout";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const metadata = { title: "Payment return" };

export default async function PaySuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; payment_id?: string; mock?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");
  const params = await searchParams;
  const store = getStore();

  const payment = params.session_id
    ? await store.getPaymentByStripeSession(params.session_id)
    : null;
  if (payment && payment.playerId !== session.playerId) {
    redirect("/account");
  }

  const copy = describeReturnPage(payment);

  return (
    <main id="main-content" className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4">
      <div className="rounded-2xl border border-line bg-ink p-8 text-center">
        <p className="font-display text-3xl uppercase tracking-wide text-gold">{copy.title}</p>
        <p className="mt-3 text-sm text-fog">{copy.body}</p>
        <p className="mt-4 text-xs text-mist">
          Returning from Stripe does not settle your fees. Confirmation waits for a signed webhook.
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
