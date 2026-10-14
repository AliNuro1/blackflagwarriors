import { cn } from "@/lib/cn";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "gold" | "warn" | "ok";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        tone === "neutral" && "bg-white/8 text-fog",
        tone === "gold" && "bg-gold/15 text-gold",
        tone === "warn" && "bg-amber-500/15 text-amber-200",
        tone === "ok" && "bg-emerald-500/15 text-emerald-200",
      )}
    >
      {children}
    </span>
  );
}
