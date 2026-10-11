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
} from "lucide-react";
import Link from "next/link";
import { Sesion, cerrarSesion, obtenerSesion } from "@/lib/auth";
import { NotificationBell } from "@/components/NotificationBell";

const CLIENTE_LINKS = [
  { href: "/cliente", label: "Inicio", icon: Home },
  { href: "/cliente/transferencias", label: "Transferir", icon: ArrowRightLeft },
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
      <div className="min-h-screen flex items-center justify-center bg-brand-50">
        <p className="text-2xl text-brand-700 font-semibold animate-pulse">Cargando su banco...</p>
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
    <div className="flex min-h-screen bg-gray-50 font-sans">
      {/* Overlay móvil */}
      {menuAbierto && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-30 transition-transform duration-200 lg:translate-x-0 ${
          menuAbierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="px-5 py-5 flex items-center justify-between border-b border-gray-100">
          <Link href="/cliente" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-md shadow-brand-500/30">
              <Building2 size={22} />
            </div>
            <div>
              <h1 className="text-lg font-black text-brand-900 leading-none">BankLite</h1>
              <p className="text-xs text-brand-500 font-semibold mt-0.5">Mi Banco Personal</p>
            </div>
          </Link>
          <button
            className="lg:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setMenuAbierto(false)}
            aria-label="Cerrar menú"
          >
            <X size={22} />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {CLIENTE_LINKS.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/cliente" && pathname.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-colors ${
                  isActive
                    ? "bg-brand-500 text-white shadow-md shadow-brand-500/30"
                    : "text-gray-600 hover:bg-brand-50 hover:text-brand-600"
                }`}
              >
                <Icon size={20} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Parte inferior */}
        <div className="px-3 py-4 border-t border-gray-100 space-y-1">
          <Link
            href="/cliente/ayuda"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
              ayudaActiva
                ? "bg-brand-50 text-brand-700"
                : "text-gray-600 hover:bg-brand-50 hover:text-brand-600"
            }`}
          >
            <HelpCircle size={20} />
            Centro de ayuda
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex-1 lg:ml-64 min-w-0 flex flex-col">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
            <button
              className="lg:hidden h-10 w-10 rounded-xl border border-gray-200 text-brand-700 hover:bg-brand-50 flex items-center justify-center"
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú"
            >
              <Menu size={22} />
            </button>
            <div className="hidden lg:block" />

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-800">{nombreCompleto || sesion.usuario.nombre}</p>
                <p className="text-xs text-gray-500">{sesion.usuario.email}</p>
              </div>
              <NotificationBell idUsuario={sesion.usuario.id_usuario} />
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white font-black flex items-center justify-center">
                {sesion.usuario.nombre.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 flex-1">{children}</main>
      </div>
    </div>
  );
}
