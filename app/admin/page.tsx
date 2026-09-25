"use client";
import { useEffect, useState } from "react";
import { obtenerSesion } from "@/lib/auth";
import {
  Users, Wallet, CreditCard, ShieldAlert, BookOpen, ArrowRightLeft, TrendingUp, Activity
} from "lucide-react";
import Link from "next/link";

const MODULOS = [
  {
    href: "/admin/usuarios", title: "Identidad & KYC", desc: "Registrar usuarios y verificar documentos de identidad",
    icon: Users, color: "bg-violet-500", ring: "ring-violet-200",
  },
  {
    href: "/admin/cuentas", title: "Cuentas Bancarias", desc: "Abrir cuentas, gestionar estados y ver limites operativos",
    icon: Wallet, color: "bg-blue-500", ring: "ring-blue-200",
  },
  {
    href: "/admin/tarjetas", title: "Tarjetas & Pagos", desc: "Emitir tarjetas, bloqueos y autorizaciones",
    icon: CreditCard, color: "bg-purple-500", ring: "ring-purple-200",
  },
  {
    href: "/admin/fraude", title: "Monitoreo Fraude", desc: "Reglas antifraude, scoring y centro de alertas",
    icon: ShieldAlert, color: "bg-rose-500", ring: "ring-rose-200",
  },
  {
    href: "/admin/ledger", title: "Ledger Contable", desc: "Libro mayor, depositos y partida doble",
    icon: BookOpen, color: "bg-amber-500", ring: "ring-amber-200",
  },
  {
    href: "/admin/transferencias", title: "Transferencias", desc: "Rieles de pago, beneficiarios y switch de pagos",
    icon: ArrowRightLeft, color: "bg-emerald-500", ring: "ring-emerald-200",
  },
];

export default function AdminDashboard() {
  const [nombre, setNombre] = useState("Admin");
  useEffect(() => {
    const s = obtenerSesion();
    if (s) setNombre(s.usuario.nombre);
  }, []);

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Bienvenida */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <Activity size={28} className="opacity-80" />
          <span className="text-indigo-200 text-sm font-bold uppercase tracking-widest">Centro de Operaciones</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight">Bienvenido, {nombre}</h1>
        <p className="text-indigo-200 mt-2 text-lg">
          Tienes acceso completo a todos los modulos de BankLite Core Banking.
        </p>
      </div>

      {/* KPI fila */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Microservicios", value: "6", sub: "Todos activos", icon: TrendingUp, color: "text-emerald-600" },
          { label: "Event Bus", value: "RabbitMQ", sub: "Conectado", icon: Activity, color: "text-blue-600" },
          { label: "Portal", value: "Admin", sub: "Acceso total", icon: ShieldAlert, color: "text-indigo-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
            <kpi.icon size={28} className={kpi.color} />
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{kpi.label}</p>
              <p className="text-xl font-black text-slate-800">{kpi.value}</p>
              <p className="text-xs text-slate-500">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Modulos */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Modulos del Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULOS.map((mod) => (
            <Link
              key={mod.href}
              href={mod.href}
              className={`bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 ring-4 ring-transparent hover:${mod.ring} group`}
            >
              <div className={`h-12 w-12 rounded-xl ${mod.color} flex items-center justify-center text-white mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                <mod.icon size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800">{mod.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{mod.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
