"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  Home,
  CreditCard,
  ArrowRightLeft,
  FileText,
  User,
  Building2,
  HelpCircle,
  Menu,
  X,
  Sparkles,
  KeyRound,
  QrCode,
} from "lucide-react";
import Link from "next/link";
import { Sesion, cerrarSesion, obtenerSesion } from "@/lib/auth";
import { NotificationBell } from "@/components/NotificationBell";
import { ClaveDinamicaWidget } from "@/components/ClaveDinamicaWidget";

const CLIENTE_LINKS = [
  { href: "/cliente", label: "Inicio", icon: Home },
  { href: "/cliente/clave-dinamica", label: "Clave Dinámica", icon: KeyRound },
  { href: "/cliente/transferencias", label: "Transferir", icon: ArrowRightLeft },
  { href: "/cliente/qr", label: "QR & Bre-B", icon: QrCode },
  { href: "/cliente/tarjetas", label: "Mis Tarjetas", icon: CreditCard },
  { href: "/cliente/movimientos", label: "Movimientos", icon: FileText },
  { href: "/cliente/perfil", label: "Mi Perfil", icon: User },
  { href: "/cliente/ayuda", label: "Ayuda", icon: HelpCircle },
];

export function ClienteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sesion, setSesion] = useState<Sesion | null | "cargando">("cargando");
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    const actual = obtenerSesion();
    if (!actual) {
      router.replace("/login");
      return;
    }
    if (actual.usuario.role === "admin") {
      router.replace("/admin");
      return;
    }
    setSesion(actual);
  }, [pathname, router]);

  // Cierra el menú móvil al navegar
  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

  if (sesion === "cargando") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3 text-slate-800">
          <div className="h-14 w-14 rounded-2xl bg-white shadow-xl shadow-slate-200/50 border border-slate-200/80 flex items-center justify-center text-sky-600 animate-pulse">
            <Building2 size={28} />
          </div>
          <p className="text-sm font-semibold text-slate-500">Accediendo a BankLite OS...</p>
        </div>
      </div>
    );
  }

  if (!sesion) return null;

  const nombreCompleto = [sesion.usuario.nombre, sesion.usuario.apellido]
    .filter(Boolean)
    .join(" ");

  function handleLogout() {
    cerrarSesion();
    router.replace("/login");
  }

  const ayudaActiva = pathname.startsWith("/cliente/ayuda");

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-sky-500/20">
      {/* Overlay móvil */}
      {menuAbierto && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      {/* Sidebar Apple White Frosted Glass */}
      <aside
        className={`w-64 bg-white/80 backdrop-blur-2xl border-r border-slate-200/80 shadow-[4px_0_30px_-10px_rgba(15,23,42,0.03)] flex flex-col fixed h-full z-40 transition-transform duration-300 lg:translate-x-0 ${
          menuAbierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="px-6 py-6 flex items-center justify-between border-b border-slate-200/70">
          <Link href="/cliente" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/15 group-hover:scale-105 transition-transform">
              <Building2 size={22} />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-slate-900 leading-none">
                BankLite
              </h1>
              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block mt-1">
                Cliente Personal
              </span>
            </div>
          </Link>
          <button
            className="lg:hidden text-slate-400 hover:text-slate-800"
            onClick={() => setMenuAbierto(false)}
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navegación Apple Fluid */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-none">
          {CLIENTE_LINKS.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/cliente" && pathname.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl font-semibold text-sm transition-all duration-150 active:scale-[0.97] ${
                  isActive
                    ? "bg-slate-900 text-white font-bold shadow-md shadow-slate-900/15"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                }`}
              >
                <Icon size={18} className={isActive ? "text-white" : "text-slate-500"} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Parte inferior */}
        <div className="px-3 py-4 border-t border-slate-200/70 space-y-1">
          <Link
            href="/cliente/ayuda"
            className={`flex items-center gap-3 px-4 py-2 rounded-2xl text-xs font-semibold transition-all active:scale-[0.97] ${
              ayudaActiva
                ? "bg-slate-100 text-slate-900 font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
            }`}
          >
            <HelpCircle size={17} />
            Centro de soporte
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-2xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-all active:scale-[0.97]"
          >
            <LogOut size={17} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <div className="flex-1 lg:ml-64 min-w-0 flex flex-col bg-[#F8FAFC]">
        {/* Header Apple Glassmorphic */}
        <header className="bg-white/75 backdrop-blur-2xl border-b border-slate-200/70 sticky top-0 z-20 shadow-[0_1px_15px_-4px_rgba(15,23,42,0.03)]">
          <div className="px-6 py-3.5 flex items-center justify-between">
            <button
              className="lg:hidden h-10 w-10 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition active:scale-[0.97]"
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú"
            >
              <Menu size={22} />
            </button>
            <div className="hidden lg:flex items-center gap-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Banca Digital Segura • Bre-B
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 tracking-tight">
                  {nombreCompleto || sesion.usuario.nombre}
                </p>
                <p className="text-xs text-slate-500 font-mono">{sesion.usuario.email}</p>
              </div>
              <ClaveDinamicaWidget idUsuario={sesion.usuario.id_usuario} />
              <NotificationBell idUsuario={sesion.usuario.id_usuario} />
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-slate-900 to-slate-700 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                {sesion.usuario.nombre.charAt(0).toUpperCase()}
              </div>
              {/* Botón Cerrar Sesión en Header */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/90 border border-rose-200/90 transition-all active:scale-[0.97] shadow-sm ml-1"
                title="Cerrar sesión de BankLite"
              >
                <LogOut size={15} />
                <span className="hidden md:inline">Cerrar sesión</span>
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-8 flex-1 bg-[#F8FAFC] relative overflow-hidden">
          {/* Ambient Glass Glow Orbs */}
          <div className="apple-ambient-glow w-96 h-96 -top-20 -left-20 bg-sky-200/40" />
          <div className="apple-ambient-glow w-96 h-96 top-1/3 -right-20 bg-emerald-100/40" />
          <div className="apple-ambient-glow w-96 h-96 bottom-0 left-1/4 bg-indigo-100/30" />

          <div className="relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
