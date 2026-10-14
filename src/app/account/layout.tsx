import { AppHeader } from "@/components/AppHeader";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      {children}
    </div>
  );
}
