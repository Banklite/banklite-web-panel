"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Inicio", letter: "•", color: "bg-slate-500" },
  { href: "/identidad", label: "Identidad", letter: "Id", color: "bg-indigo-500" },
  { href: "/cuentas", label: "Cuentas", letter: "Cu", color: "bg-emerald-500" },
  { href: "/ledger", label: "Ledger", letter: "Le", color: "bg-amber-500" },
  { href: "/transferencias", label: "Transferencias", letter: "Tr", color: "bg-sky-500" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 bg-ink-900 text-slate-200 min-h-screen py-6 px-3 sticky top-0 self-start">
      <div className="flex items-center gap-2 px-2 mb-6">
        <div className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center font-bold text-white">
          B
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight">BankLite</p>
          <p className="text-slate-400 text-[11px]">Panel operativo</p>
        </div>
      </div>
      <nav className="space-y-1">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span
                className={`h-6 w-6 rounded-md ${link.color} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}
              >
                {link.letter}
              </span>
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8 px-3">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Identity · Account · Ledger · Transfer
        </p>
      </div>
    </aside>
  );
}
