"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  Activity,
  LogOut,
  Users,
  Wallet,
  CreditCard,
  BookOpen,
  ArrowRightLeft,
  ShieldAlert,
  LayoutDashboard,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { Sesion, cerrarSesion, obtenerSesion } from "@/lib/auth";

const ADMIN_LINKS = [
  { href: "/admin", label: "Centro de Operaciones", icon: LayoutDashboard, hint: "Dashboard Admin" },
  { href: "/admin/usuarios", label: "Identidad & KYC", icon: Users, hint: "Gestion Usuarios" },
  { href: "/admin/cuentas", label: "Cuentas Bancarias", icon: Wallet, hint: "Abrir / Gestionar" },
  { href: "/admin/tarjetas", label: "Tarjetas & Pagos", icon: CreditCard, hint: "Emitir / Bloquear" },
  { href: "/admin/fraude", label: "Monitoreo Fraude", icon: ShieldAlert, hint: "Alertas & Scoring" },
  { href: "/admin/ledger", label: "Ledger Contable", icon: BookOpen, hint: "Partida Doble" },
  { href: "/admin/rastreo", label: "Rastreo Transacciones", icon: ArrowRightLeft, hint: "Buscar & Auditar" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sesion, setSesion] = useState<Sesion | null | "cargando">("cargando");

  useEffect(() => {
    const actual = obtenerSesion();
    if (!actual) {
      router.replace("/login");
      return;
    }
    if (actual.usuario.role !== "admin") {
      router.replace("/cliente");
      return;
    }
    setSesion(actual);
  }, [pathname, router]);

  if (sesion === "cargando") {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">
        Cargando...
      </div>
    );
  }

  if (!sesion) return null;

  const nombreCompleto = [sesion.usuario.nombre, sesion.usuario.apellido]
    .filter(Boolean)
    .join(" ");
  const iniciales =
    (sesion.usuario.nombre?.[0] ?? "") + (sesion.usuario.apellido?.[0] ?? "");

  function handleLogout() {
    cerrarSesion();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 flex flex-col md:flex-row font-sans">
      {/* Sidebar Admin */}
      <aside className="w-full md:w-72 bg-corporate-gradient text-slate-300 md:min-h-screen flex flex-col shadow-2xl z-20 relative overflow-hidden">
        <div className="absolute top-0 -left-1/2 w-full h-64 bg-indigo-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 -right-1/2 w-full h-64 bg-fuchsia-500/10 blur-[100px] pointer-events-none" />

        <div className="p-8 flex items-center gap-4 relative z-10">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/40">
            <Building2 size={26} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight leading-none">BankLite</h1>
            <p className="text-[10px] text-indigo-300 font-bold tracking-[0.2em] uppercase mt-1">Panel Admin</p>
          </div>
        </div>

        <div className="flex-1 px-5 py-4 overflow-y-auto relative z-10 space-y-6">
          <div>
            <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider px-3 mb-2">
              Modulos del Sistema
            </p>
            <nav className="flex flex-col gap-1">
              {ADMIN_LINKS.map((link) => {
                const isActive = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href));
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group ${
                      isActive
                        ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-900/30 border border-indigo-500/30"
                        : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400 group-hover:text-indigo-400"}`}>
                      <Icon size={15} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold tracking-tight">{link.label}</div>
                      <p className={`text-[10px] ${isActive ? "text-indigo-200" : "text-slate-500"}`}>{link.hint}</p>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-3">
              <Activity size={14} className="text-emerald-400" />
              System Status
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Gateway</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Online
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Event Bus</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> RabbitMQ
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-black/20 text-[11px] text-slate-500 border-t border-white/5 flex items-center justify-between relative z-10">
          <div>
            <p className="font-semibold text-slate-300 flex items-center gap-1">
              <Globe size={12} /> Global Network
            </p>
            <p className="mt-0.5">Enterprise v1.0.0</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-[72px] bg-white/80 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-10 shadow-sm z-10 sticky top-0">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Centro de Operaciones</h2>
          <div className="flex items-center gap-4">
            <div className="flex flex-col text-right">
              <span className="text-sm font-bold text-slate-900">{nombreCompleto || sesion.usuario.email}</span>
              <span className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">Administrador</span>
            </div>
            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-white shadow-sm text-indigo-700 font-bold uppercase">
              {iniciales || "A"}
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesion"
              className="h-10 w-10 rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="p-6 md:p-10 max-w-[1400px] mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
