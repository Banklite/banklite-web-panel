"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Wallet, CreditCard, BookOpen, ArrowRightLeft, ShieldAlert, Sparkles } from "lucide-react";

const LINKS = [
  { href: "/", label: "Inicio / Dashboard", step: null, icon: LayoutDashboard },
  { href: "/identidad", label: "Identidad & KYC", step: "1", hint: "Crear Usuario", icon: Users },
  { href: "/cuentas", label: "Cuentas Bancarias", step: "2", hint: "Abrir Cuenta", icon: Wallet },
  { href: "/tarjetas", label: "Tarjetas & Pagos", step: "3", hint: "Emitir / Pagar", icon: CreditCard },
  { href: "/fraude", label: "Monitoreo Fraude", step: "4", hint: "Alertas Riesgo", icon: ShieldAlert },
  { href: "/ledger", label: "Ledger Contable", step: "5", hint: "Partida Doble", icon: BookOpen },
  { href: "/transferencias", label: "Transferencias", step: "6", hint: "Rieles de Pago", icon: ArrowRightLeft },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between px-3 mb-2">
        <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">Flujo Principal</p>
        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
          <Sparkles size={10} /> Guiado
        </span>
      </div>
      {LINKS.map((link) => {
        const active = pathname === link.href;
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group ${
              active
                ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-900/30 border border-indigo-500/30"
                : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-lg ${active ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400 group-hover:text-indigo-400"}`}>
                <Icon size={16} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs tracking-tight">{link.label}</span>
                </div>
                {link.hint && (
                  <p className={`text-[10px] ${active ? "text-indigo-200" : "text-slate-500"}`}>{link.hint}</p>
                )}
              </div>
            </div>
            {link.step && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  active
                    ? "bg-white text-indigo-700"
                    : "bg-slate-800 text-slate-400 group-hover:bg-indigo-950 group-hover:text-indigo-300"
                }`}
              >
                Paso {link.step}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
