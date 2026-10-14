import { AdminNav } from "@/components/admin/AdminNav";
import { AdminAccessError, loadAdminAudit } from "@/lib/admin/dashboard";
import { getStore } from "@/lib/data";
import { formatDateTime } from "@/lib/dates";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const metadata = { title: "Admin · Audit" };

export default async function AdminAuditPage() {
  let data;
  try {
    data = await loadAdminAudit({ session: await getSession(), store: getStore() });
  } catch (error) {
    if (error instanceof AdminAccessError && error.status === 401) redirect("/");
    redirect("/account");
  }

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-3xl uppercase tracking-wide">Audit log</h1>
      <p className="mt-2 text-sm text-mist">
        Administrator actions only. Entries do not include secrets or card data.
      </p>
      <AdminNav current="/admin/audit" />
      {data.events.length === 0 ? (
        <p className="mt-8 rounded-xl border border-line bg-panel p-6 text-sm text-fog">
          No administrator actions recorded yet.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel">
          {data.events.map((event) => (
            <li key={event.id} className="px-4 py-3">
              <p className="text-sm text-paper">
                {event.summary || event.action}
              </p>
              <p className="text-xs text-mist">
                {event.actorName} · {event.action} · {event.entityType} · {formatDateTime(event.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
