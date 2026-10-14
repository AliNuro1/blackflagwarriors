import { paymentsCsv } from "@/lib/admin/csv";
import { filterPayments, parseAdminFilters } from "@/lib/admin/dashboard";
import { withAdminRead } from "@/lib/admin/guard";

export async function GET(request: Request) {
  return withAdminRead(async ({ store }) => {
    const filters = parseAdminFilters(new URL(request.url).searchParams);
    const [players, payments] = await Promise.all([store.listPlayers(), store.listAllPayments()]);
    const csv = paymentsCsv(filterPayments(payments, filters), players);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="bfw-payments.csv"',
        "Cache-Control": "no-store",
      },
    });
  });
}
