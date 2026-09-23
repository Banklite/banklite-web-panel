"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Wallet, CreditCard, BookOpen, ArrowRightLeft, ShieldAlert } from "lucide-react";

const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/identidad", label: "Identidad & KYC", icon: Users },
  { href: "/cuentas", label: "Cuentas", icon: Wallet },
  { href: "/tarjetas", label: "Tarjetas", icon: CreditCard },
  { href: "/fraude", label: "Detecci?n Fraude", icon: ShieldAlert },
  { href: "/ledger", label: "Ledger Contable", icon: BookOpen },
  { href: "/transferencias", label: "Transferencias", icon: ArrowRightLeft },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-2">
      <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">M?dulos Core</p>
      {LINKS.map((link) => {
        const active = pathname === link.href;
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
              active
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            }`}
          >
            <Icon size={18} className={active ? "text-indigo-200" : "text-slate-500"} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
