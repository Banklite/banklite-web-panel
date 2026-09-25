"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatCard } from "@/components/StatCard";
import { Users, Wallet, CreditCard, ArrowRightLeft, ShieldAlert, BookOpen, CheckCircle2 } from "lucide-react";
import {
  Usuario,
  Cuenta,
  Tarjeta,
  AlertaFraude,
  listUsuarios,
  listAccounts,
  listCards,
  listFraudAlerts,
} from "@/lib/api";

const SECCIONES = [
  {
    href: "/identidad",
    titulo: "Identidad & KYC",
    icon: Users,
    color: "bg-indigo-50 text-indigo-600 ring-indigo-500/30",
    hover: "hover:border-indigo-300 hover:ring-2 hover:ring-indigo-100",
    descripcion: "Onboarding, validaci?n KYC y perfiles. (identity-service)",
  },
  {
    href: "/cuentas",
    titulo: "Cuentas Bancarias",
    icon: Wallet,
    color: "bg-emerald-50 text-emerald-600 ring-emerald-500/30",
    hover: "hover:border-emerald-300 hover:ring-2 hover:ring-emerald-100",
    descripcion: "Apertura, estados y l?mites operativos. (account-service)",
  },
  {
    href: "/tarjetas",
    titulo: "Tarjetas & Autorizaciones",
    icon: CreditCard,
    color: "bg-purple-50 text-purple-600 ring-purple-500/30",
    hover: "hover:border-purple-300 hover:ring-2 hover:ring-purple-100",
    descripcion: "Emisi?n de tarjetas, bloqueos y transacciones. (card-service)",
  },
  {
    href: "/fraude",
    titulo: "Detecci?n de Fraude",
    icon: ShieldAlert,
    color: "bg-rose-50 text-rose-600 ring-rose-500/30",
    hover: "hover:border-rose-300 hover:ring-2 hover:ring-rose-100",
    descripcion: "Motor de reglas, scoring de riesgo y alertas. (fraud-service)",
  },
  {
    href: "/ledger",
    titulo: "Core Ledger Contable",
    icon: BookOpen,
    color: "bg-amber-50 text-amber-600 ring-amber-500/30",
    hover: "hover:border-amber-300 hover:ring-2 hover:ring-amber-100",
    descripcion: "Fuente de verdad contable y partida doble. (ledger-service)",
  },
  {
    href: "/transferencias",
    titulo: "Switch de Transferencias",
    icon: ArrowRightLeft,
    color: "bg-sky-50 text-sky-600 ring-sky-500/30",
    hover: "hover:border-sky-300 hover:ring-2 hover:ring-sky-100",
    descripcion: "Rieles de pago y automatizaci?n de env?os. (transfer-service)",
  },
];

export default function Home() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([]);
  const [alertas, setAlertas] = useState<AlertaFraude[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listUsuarios().catch(() => []),
      listAccounts().catch(() => []),
      listCards().catch(() => []),
      listFraudAlerts().catch(() => []),
    ])
      .then(([u, c, t, a]) => {
        setUsuarios(u);
        setCuentas(c);
        setTarjetas(t);
        setAlertas(a);
      })
      .finally(() => setLoading(false));
  }, []);

  const verificados = usuarios.filter((u) => u.estado === "verificado").length;
  const tarjetasActivas = tarjetas.filter((t) => t.estado === "activa").length;
  const alertasAbiertas = alertas.filter((a) => a.estado === "abierta").length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Visi?n Global del Ecosistema BankLite</h1>
        <p className="text-slate-500 mt-1">
          Arquitectura desacoplada basada en microservicios independientes, consistencia eventual (RabbitMQ) y seguridad financiera.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Usuarios Totales" value={loading ? "..." : usuarios.length} accent="text-slate-900" />
        <StatCard label="KYC Verificados" value={loading ? "..." : verificados} accent="text-indigo-600" />
        <StatCard label="Tarjetas Emitidas" value={loading ? "..." : `${tarjetasActivas} activas`} accent="text-purple-600" />
        <StatCard label="Alertas de Fraude" value={loading ? "..." : alertasAbiertas} accent={alertasAbiertas > 0 ? "text-rose-600" : "text-emerald-600"} />
      </div>

      {/* Quick Start Wizard Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-3xl pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
            <CheckCircle2 size={16} className="text-emerald-400" /> ¿Cómo comenzar a operar?
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Flujo Guiado Completo</h2>
          <p className="text-slate-300 text-sm max-w-2xl mb-6">
            Para probar el sistema sin complicaciones, sigue estos 4 sencillos pasos en orden.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/identidad"
              className="p-4 rounded-2xl bg-white/10 hover:bg-indigo-600/80 border border-white/15 transition-all text-left group"
            >
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/40 text-indigo-200 mb-2">
                Paso 1
              </span>
              <h4 className="font-bold text-sm text-white group-hover:underline">1. Registrar Cliente</h4>
              <p className="text-xs text-slate-300 mt-1">Crea un usuario y verifica su KYC.</p>
            </Link>

            <Link
              href="/cuentas"
              className="p-4 rounded-2xl bg-white/10 hover:bg-emerald-600/80 border border-white/15 transition-all text-left group"
            >
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/40 text-emerald-200 mb-2">
                Paso 2
              </span>
              <h4 className="font-bold text-sm text-white group-hover:underline">2. Abrir Cuenta</h4>
              <p className="text-xs text-slate-300 mt-1">Vincula una cuenta al usuario.</p>
            </Link>

            <Link
              href="/tarjetas"
              className="p-4 rounded-2xl bg-white/10 hover:bg-purple-600/80 border border-white/15 transition-all text-left group"
            >
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/40 text-purple-200 mb-2">
                Paso 3
              </span>
              <h4 className="font-bold text-sm text-white group-hover:underline">3. Emitir Tarjeta</h4>
              <p className="text-xs text-slate-300 mt-1">Crea tarjeta física o virtual.</p>
            </Link>

            <Link
              href="/tarjetas"
              className="p-4 rounded-2xl bg-white/10 hover:bg-rose-600/80 border border-white/15 transition-all text-left group"
            >
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/40 text-rose-200 mb-2">
                Paso 4
              </span>
              <h4 className="font-bold text-sm text-white group-hover:underline">4. Simular Compra</h4>
              <p className="text-xs text-slate-300 mt-1">Prueba compras y ve alertas.</p>
            </Link>
          </div>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {SECCIONES.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className={`p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm transition-all duration-300 flex flex-col justify-between group ${s.hover}`}
            >
              <div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ring-4 ${s.color} transition-transform group-hover:scale-110`}>
                  <Icon size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {s.titulo}
                </h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  {s.descripcion}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                <span>Abrir Panel</span>
                <span className="group-hover:translate-x-1 transition-transform">?</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
