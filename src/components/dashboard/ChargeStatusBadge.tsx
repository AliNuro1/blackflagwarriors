import { Badge } from "@/components/ui/badge";
import type { ChargeDisplayStatus } from "@/lib/dashboard";

export function ChargeStatusBadge({
  status,
  overdue,
}: {
  status: ChargeDisplayStatus;
  overdue: boolean;
}) {
  if (status === "paid") return <Badge tone="ok">Paid</Badge>;
  if (status === "partial") return <Badge tone="partial">Part paid</Badge>;
  if (status === "void") return <Badge>Void</Badge>;
  return (
    <>
      <Badge tone="gold">Outstanding</Badge>
      {overdue ? <Badge tone="warn">Overdue</Badge> : null}
    </>
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  if (status === "succeeded") return <Badge tone="ok">Confirmed</Badge>;
  if (status === "pending") return <Badge tone="partial">Pending</Badge>;
  if (status === "refunded") return <Badge>Refunded</Badge>;
  return <Badge tone="warn">{status}</Badge>;
}
