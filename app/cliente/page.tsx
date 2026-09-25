"use client";
import { useEffect, useState } from "react";
import { obtenerSesion } from "@/lib/auth";
import { CreditCard, ArrowRightLeft, FileText, User, Phone, Shield } from "lucide-react";
import Link from "next/link";

const ACCIONES = [
  {
    href: "/cliente/tarjetas", label: "Ver mis Tarjetas",
    desc: "Consulte el numero y estado de sus tarjetas",
    icon: CreditCard, bg: "bg-purple-600", hover: "hover:bg-purple-700",
  },
  {
    href: "/cliente/transferencias", label: "Transferir Dinero",
    desc: "Envie dinero a otras cuentas de forma segura",
    icon: ArrowRightLeft, bg: "bg-green-600", hover: "hover:bg-green-700",
  },
  {
    href: "/cliente/movimientos", label: "Ver Movimientos",
    desc: "Consulte su saldo y los ultimos movimientos",
    icon: FileText, bg: "bg-amber-500", hover: "hover:bg-amber-600",
  },
  {
    href: "/cliente/perfil", label: "Mi Perfil",
    desc: "Vea y actualice sus datos personales",
    icon: User, bg: "bg-blue-600", hover: "hover:bg-blue-700",
  },
];

export default function ClienteDashboard() {
  const [nombre, setNombre] = useState("Cliente");

  useEffect(() => {
    const s = obtenerSesion();
    if (s) setNombre(s.usuario.nombre);
  }, []);

  return (
    <div className="space-y-8">
      {/* Bienvenida */}
      <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-800 text-white p-8 shadow-xl">
        <p className="text-blue-200 text-lg font-semibold mb-1">Bienvenido/a</p>
        <h1 className="text-4xl font-black tracking-tight">{nombre}</h1>
        <p className="text-blue-200 mt-3 text-xl">
          Aqui puede ver su cuenta y realizar sus operaciones bancarias.
        </p>
        <div className="mt-4 flex items-center gap-2 text-blue-200">
          <Shield size={18} />
          <span className="text-sm font-semibold">Su dinero esta protegido y seguro</span>
        </div>
      </div>

      {/* Acciones principales */}
      <div>
        <h2 className="text-2xl font-bold text-slate-700 mb-5">Que desea hacer hoy?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {ACCIONES.map((accion) => (
            <Link
              key={accion.href}
              href={accion.href}
              className={`${accion.bg} ${accion.hover} text-white rounded-3xl p-7 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex items-center gap-5`}
            >
              <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <accion.icon size={34} />
              </div>
              <div>
                <h3 className="text-xl font-black">{accion.label}</h3>
                <p className="text-white/80 text-sm mt-1">{accion.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Aviso de ayuda */}
      <div className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-6 flex items-start gap-4">
        <Phone size={28} className="text-blue-600 flex-shrink-0 mt-1" />
        <div>
          <h3 className="text-lg font-bold text-blue-900">Necesita ayuda?</h3>
          <p className="text-blue-700 mt-1 text-base">
            Si tiene problemas con su cuenta, llame a nuestro centro de atencion:
          </p>
          <p className="text-2xl font-black text-blue-800 mt-2">01 800 BANKLITE</p>
          <p className="text-sm text-blue-500 mt-1">Disponible de lunes a viernes, 8am - 6pm</p>
        </div>
      </div>
    </div>
  );
}
