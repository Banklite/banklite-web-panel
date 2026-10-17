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
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3 animate-pulse text-white">
          <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center">
            <Building2 size={28} />
          </div>
          <p className="text-sm font-semibold text-neutral-400">Accediendo a BankLite OS...</p>
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
    <div className="flex min-h-screen bg-black text-neutral-100 font-sans selection:bg-white/20">
      {/* Overlay móvil */}
      {menuAbierto && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      {/* Sidebar Apple Dark Titanium */}
      <aside
        className={`w-64 bg-neutral-950/90 backdrop-blur-2xl border-r border-white/[0.08] flex flex-col fixed h-full z-40 transition-transform duration-300 lg:translate-x-0 ${
          menuAbierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="px-6 py-6 flex items-center justify-between border-b border-white/[0.08]">
          <Link href="/cliente" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-white text-black flex items-center justify-center shadow-lg shadow-white/10 group-hover:scale-105 transition-transform">
              <Building2 size={22} />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-white leading-none">
                BankLite
              </h1>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mt-1">
                Cliente Personal
              </span>
            </div>
          </Link>
          <button
            className="lg:hidden text-neutral-400 hover:text-white"
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
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] ${
                  isActive
                    ? "bg-white text-black font-bold shadow-lg shadow-white/10"
                    : "text-neutral-400 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <Icon size={19} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Parte inferior */}
        <div className="px-3 py-4 border-t border-white/[0.08] space-y-1">
          <Link
            href="/cliente/ayuda"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all active:scale-[0.98] ${
              ayudaActiva
                ? "bg-white/[0.08] text-white"
                : "text-neutral-400 hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            <HelpCircle size={18} />
            Centro de soporte
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-all active:scale-[0.98]"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <div className="flex-1 lg:ml-64 min-w-0 flex flex-col bg-black">
        {/* Header Apple Glassmorphic */}
        <header className="bg-black/60 backdrop-blur-2xl border-b border-white/[0.08] sticky top-0 z-20">
          <div className="px-6 py-3.5 flex items-center justify-between">
            <button
              className="lg:hidden h-10 w-10 rounded-xl border border-white/10 text-neutral-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition active:scale-95"
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú"
            >
              <Menu size={22} />
            </button>
            <div className="hidden lg:block text-xs font-semibold tracking-wider text-neutral-400 uppercase">
              Banca Digital Protegida
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-white tracking-tight">
                  {nombreCompleto || sesion.usuario.nombre}
                </p>
                <p className="text-xs text-neutral-400 font-mono">{sesion.usuario.email}</p>
              </div>
              <ClaveDinamicaWidget idUsuario={sesion.usuario.id_usuario} />
              <NotificationBell idUsuario={sesion.usuario.id_usuario} />
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-neutral-800 to-neutral-700 border border-white/20 text-white font-bold text-sm flex items-center justify-center shadow">
                {sesion.usuario.nombre.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-8 flex-1 bg-black">{children}</main>
      </div>
    </div>
  );
}
