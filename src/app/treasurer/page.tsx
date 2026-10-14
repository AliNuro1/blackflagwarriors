import { redirect } from "next/navigation";

export default function TreasurerRedirect() {
  redirect("/admin");
}
