"use client";

export default function AccountError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main-content" className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="font-display text-2xl uppercase tracking-wide">Could not load your fees</h1>
      <p className="mt-2 text-sm text-fog">Try again. If this keeps happening, tell the club admin.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 h-11 rounded-md bg-paper px-4 text-sm font-semibold text-ink"
      >
        Try again
      </button>
    </main>
  );
}
