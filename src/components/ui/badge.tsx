import { cn } from "@/lib/cn";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "gold" | "warn" | "ok" | "partial";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        tone === "neutral" && "bg-white/10 text-fog",
        tone === "gold" && "bg-white/15 text-paper",
        tone === "warn" && "border border-paper/40 text-paper",
        tone === "ok" && "bg-white text-ink",
        tone === "partial" && "border border-fog text-fog",
      )}
    >
      {children}
    </span>
  );
}
