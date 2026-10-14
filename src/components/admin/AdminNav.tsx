import Link from "next/link";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/players", label: "Players" },
  { href: "/admin/charges", label: "Charges" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/audit", label: "Audit log" },
];

export function AdminNav({ current }: { current: string }) {
  return (
    <nav aria-label="Administrator" className="mt-6 flex flex-wrap gap-2 text-sm">
      {links.map((link) => {
        const active = current === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 ${
              active ? "border-gold bg-gold/15 text-gold" : "border-line text-fog hover:text-paper"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
