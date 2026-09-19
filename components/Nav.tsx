"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/identidad", label: "Identidad" },
  { href: "/cuentas", label: "Cuentas" },
  { href: "/ledger", label: "Ledger" },
  { href: "/transferencias", label: "Transferencias" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`px-4 py-2 text-sm font-medium rounded-t-md whitespace-nowrap transition-colors ${
              active
                ? "bg-slate-50 text-brand-700"
                : "text-brand-100 hover:bg-white/10 hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
