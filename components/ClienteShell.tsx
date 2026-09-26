"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Home, CreditCard, ArrowRightLeft, FileText, User, Building2 } from "lucide-react";
import Link from "next/link";
import { Sesion, cerrarSesion, obtenerSesion } from "@/lib/auth";

const CLIENTE_LINKS = [
  { href: "/cliente", label: "Inicio", icon: Home, color: "text-blue-600" },
  { href: "/cliente/tarjetas", label: "Mis Tarjetas", icon: CreditCard, color: "text-purple-600" },
  { href: "/cliente/transferencias", label: "Transferir Dinero", icon: ArrowRightLeft, color: "text-green-600" },
  { href: "/cliente/movimientos", label: "Mis Movimientos", icon: FileText, color: "text-amber-600" },
  { href: "/cliente/perfil", label: "Mi Perfil", icon: User, color: "text-indigo-600" },
];

export function ClienteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sesion, setSesion] = useState<Sesion | null | "cargando">("cargando");

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

  if (sesion === "cargando") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-2xl text-blue-700 font-semibold animate-pulse">Cargando su banco...</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 font-sans">
      {/* Header accesible */}
      <header className="bg-white border-b-4 border-blue-600 shadow-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-md">
              <Building2 size={28} />
            </div>
            <div>
              <h1 className="text-xl font-black text-blue-900 leading-none">BankLite</h1>
              <p className="text-xs text-blue-500 font-semibold">Mi Banco Personal</p>
            </div>
          </div>

          {/* Usuario y logout */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-lg font-bold text-slate-800">Hola, {sesion.usuario.nombre}!</p>
              <p className="text-sm text-slate-500">{sesion.usuario.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold px-4 py-2 rounded-xl border-2 border-red-200 transition-colors text-sm"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navegacion principal — botones grandes y claros */}
      <nav className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-2 overflow-x-auto">
          {CLIENTE_LINKS.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/cliente" && pathname.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-base whitespace-nowrap transition-all duration-200 min-w-fit ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                    : `bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700 border-2 border-transparent hover:border-blue-200`
                }`}
              >
                <Icon size={20} />
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Contenido principal */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-slate-400 text-sm border-t border-slate-100 mt-8">
        <p>BankLite — Tu dinero seguro <span className="text-blue-400 font-bold">siempre</span></p>
        <p className="mt-1">Si tiene dudas, llame al <span className="font-bold text-slate-600">01 800 BANKLITE</span></p>
      </footer>
    </div>
  );
}
