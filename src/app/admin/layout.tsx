import { AppHeader } from "@/components/AppHeader";
import { AdminAccessError, requireAdmin } from "@/lib/admin/access";
import { getStore } from "@/lib/data";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  try {
    await requireAdmin(session, getStore());
  } catch (error) {
    if (error instanceof AdminAccessError && error.status === 401) redirect("/");
    redirect("/account");
  }

  return (
    <div className="min-h-screen">
      <AppHeader session={session!} />
      {children}
    </div>
  );
}
