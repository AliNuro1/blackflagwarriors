export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16" aria-busy="true" aria-live="polite">
      <p className="text-sm uppercase tracking-wider text-mist">Loading your account…</p>
      <div className="mt-6 h-24 animate-pulse rounded-xl bg-panel" />
      <div className="mt-4 h-48 animate-pulse rounded-xl bg-panel" />
    </main>
  );
}
