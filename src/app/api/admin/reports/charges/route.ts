import { chargesCsv } from "@/lib/admin/csv";
import { filterCharges, parseAdminFilters } from "@/lib/admin/dashboard";
import { withAdminRead } from "@/lib/admin/guard";

export async function GET(request: Request) {
  return withAdminRead(async ({ store }) => {
    const filters = parseAdminFilters(new URL(request.url).searchParams);
    const [players, charges] = await Promise.all([store.listPlayers(), store.listAllCharges()]);
    const csv = chargesCsv(filterCharges(charges, filters), players);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="bfw-charges.csv"',
        "Cache-Control": "no-store",
      },
    });
  });
}
