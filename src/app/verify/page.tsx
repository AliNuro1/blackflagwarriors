import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { OtpForm } from "@/components/OtpForm";
import { maskUkMobile } from "@/lib/phone";
import { getPendingPhone } from "@/lib/session";

export default async function VerifyPage() {
  const phone = await getPendingPhone();
  const masked = phone ? maskUkMobile(phone) : "your mobile";

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <main id="main-content" className="rounded-2xl border border-line bg-ink p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <BrandMark className="h-14 w-14" />
          <h1 className="font-display text-2xl uppercase tracking-wide text-gold">Enter your code</h1>
        </div>
        <OtpForm maskedPhone={masked} />
        <p className="mt-6 text-sm text-mist">
          Wrong number?{" "}
          <Link href="/" className="text-gold hover:underline">
            Start again
          </Link>
        </p>
      </main>
    </div>
  );
}
