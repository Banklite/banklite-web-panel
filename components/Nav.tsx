"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CreditCard, BookOpen, ArrowRightLeft } from "lucide-react";

// El panel se navega en el mismo orden en que ocurre una operación real:
// 1) se identifica y verifica al cliente, 2) se le abre una cuenta,
// 3) el dinero se contabiliza en el ledger, 4) se transfiere. Por eso cada
// módulo lleva un número de paso — no es un menú de páginas sueltas.
const FLUJO = [
  { href: "/identidad", label: "Identidad & KYC", icon: Users, paso: 1 },
  { href: "/cuentas", label: "Cuentas", icon: CreditCard, paso: 2 },
  { href: "/ledger", label: "Ledger Contable", icon: BookOpen, paso: 3 },
  { href: "/transferencias", label: "Transferencias", icon: ArrowRightLeft, paso: 4 },
];

export function Nav() {
  const pathname = usePathname();

  function linkClass(active: boolean) {
    return `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
      active
        ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
        : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
    }`;
  }

  return (
    <nav className="flex flex-col gap-6">
      <div>
        <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">General</p>
        <Link href="/" className={linkClass(pathname === "/")}>
          <LayoutDashboard size={18} className={pathname === "/" ? "text-indigo-200" : "text-slate-500"} />
          Dashboard
        </Link>
      </div>

      <div>
        <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Flujo de una operación bancaria
        </p>
        <div className="flex flex-col gap-2">
          {FLUJO.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href} className={linkClass(active)}>
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    active ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {link.paso}
                </span>
                <Icon size={18} className={active ? "text-indigo-200" : "text-slate-500"} />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
