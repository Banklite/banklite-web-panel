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
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white flex items-center justify-center shadow-md shadow-slate-900/20 group-hover:scale-105 transition-all duration-200">
              <Building2 size={20} className="text-sky-400" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-slate-950 leading-none">
                BankLite
              </h1>
              <span className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-wider block mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Cliente Personal
              </span>
            </div>
          </Link>
          <button
            className="lg:hidden text-slate-400 hover:text-slate-800 p-1.5 rounded-xl transition-all duration-200 active:scale-[0.97]"
            onClick={() => setMenuAbierto(false)}
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navegación Apple Fluid */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-none">
          {CLIENTE_LINKS.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/cliente" && pathname.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-bold text-sm transition-all duration-200 active:scale-[0.97] ${
                  isActive
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/15 scale-[1.01]"
                    : "text-slate-600 hover:text-slate-950 hover:bg-white/80 hover:shadow-xs"
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-xl flex items-center justify-center transition-transform duration-200 ${
                    isActive
                      ? "bg-white/15 text-white"
                      : "bg-slate-100 text-slate-500 group-hover:scale-105"
                  }`}
                >
                  <Icon size={17} />
                </div>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Parte inferior */}
        <div className="px-3 py-4 border-t border-slate-200/70 space-y-1.5">
          <Link
            href="/cliente/ayuda"
            className={`flex items-center gap-3 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all duration-200 active:scale-[0.97] ${
              ayudaActiva
                ? "bg-slate-100 text-slate-950"
                : "text-slate-600 hover:text-slate-950 hover:bg-white/80"
            }`}
          >
            <div className="h-7 w-7 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
              <HelpCircle size={15} />
            </div>
            <span>Centro de soporte</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-2xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 transition-all duration-200 active:scale-[0.97]"
          >
            <div className="h-7 w-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <LogOut size={14} />
            </div>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <div className="flex-1 lg:ml-64 min-w-0 flex flex-col bg-[#F8FAFC]">
        {/* Header Apple Glassmorphic */}
        <header className="bg-white/75 backdrop-blur-2xl border-b border-slate-200/70 sticky top-0 z-20 shadow-[0_1px_15px_-4px_rgba(15,23,42,0.03)]">
          <div className="px-6 py-3.5 flex items-center justify-between">
            <button
              className="lg:hidden h-10 w-10 rounded-2xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white flex items-center justify-center transition-all duration-200 active:scale-[0.97] shadow-xs"
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </button>
            <div className="hidden lg:flex items-center gap-2 text-xs font-extrabold tracking-wider text-slate-500 uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Banca Digital Segura • Bre-B
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-extrabold text-slate-900 tracking-tight">
                  {nombreCompleto || sesion.usuario.nombre}
                </p>
                <p className="text-[11px] text-slate-400 font-mono font-medium">{sesion.usuario.email}</p>
              </div>
              <ClaveDinamicaWidget idUsuario={sesion.usuario.id_usuario} />
              <NotificationBell idUsuario={sesion.usuario.id_usuario} />
              {/* Avatar con Apple badge y pulso en vivo */}
              <div className="relative">
                <div className="apple-avatar-badge h-9 w-9 bg-gradient-to-tr from-sky-500 via-indigo-600 to-slate-900 text-white font-black text-xs shadow-md shadow-slate-900/10">
                  {sesion.usuario.nombre.charAt(0).toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-xs" title="Sesión activa" />
              </div>
              {/* Botón Cerrar Sesión en Header */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold text-rose-600 hover:text-rose-700 bg-rose-50/90 hover:bg-rose-100 border border-rose-200/80 transition-all duration-200 active:scale-[0.97] hover:scale-[1.02] shadow-xs ml-1"
                title="Cerrar sesión de BankLite"
              >
                <LogOut size={14} />
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
