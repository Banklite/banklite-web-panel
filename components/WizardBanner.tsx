"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserPlus, Wallet, CreditCard, ShieldAlert, ChevronRight } from "lucide-react";

const STEPS = [
  {
    step: 1,
    title: "1. Crear Cliente",
    subtitle: "Registro & KYC",
    href: "/identidad",
    icon: UserPlus,
  },
  {
    step: 2,
    title: "2. Abrir Cuenta",
    subtitle: "Cuenta Bancaria",
    href: "/cuentas",
    icon: Wallet,
  },
  {
    step: 3,
    title: "3. Tarjetas",
    subtitle: "Emisión & Titular",
    href: "/tarjetas",
    icon: CreditCard,
  },
  {
    step: 4,
    title: "4. Fraude",
    subtitle: "Alertas & Riesgo",
    href: "/fraude",
    icon: ShieldAlert,
  },
];

export function WizardBanner() {
  const pathname = usePathname();

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 rounded-2xl shadow-xl border border-indigo-500/20 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 border-b border-white/10 pb-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/20 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
            Flujo Guiado Paso a Paso
          </span>
          <h3 className="text-base font-bold text-white mt-1">Guía Rápida de Operaciones BankLite</h3>
        </div>
        <p className="text-xs text-slate-400">Haz clic en cada paso en orden para probar el sistema fácilmente</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {STEPS.map((s, idx) => {
          const isActive = pathname === s.href;
          const Icon = s.icon;
          return (
            <Link
              key={s.step}
              href={s.href}
              className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-between border ${
                isActive
                  ? "bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400/40"
                  : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-indigo-400/50"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`p-2 rounded-lg text-xs font-bold ${
                    isActive ? "bg-white text-indigo-700" : "bg-white/10 text-indigo-300"
                  }`}
                >
                  <Icon size={16} />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold truncate leading-snug">{s.title}</p>
                  <p className={`text-[10px] truncate ${isActive ? "text-indigo-100" : "text-slate-400"}`}>
                    {s.subtitle}
                  </p>
                </div>
              </div>
              {idx < STEPS.length - 1 && (
                <ChevronRight size={14} className="text-slate-500 hidden md:block flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
