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
        <StatCard label="Usuarios Totales" value={loading ? "?" : usuarios.length} accent="text-slate-900" />
        <StatCard label="KYC Verificados" value={loading ? "?" : verificados} accent="text-indigo-600" />
        <StatCard label="Tarjetas Emitidas" value={loading ? "?" : `${tarjetasActivas} activas`} accent="text-purple-600" />
        <StatCard label="Alertas de Fraude" value={loading ? "?" : alertasAbiertas} accent={alertasAbiertas > 0 ? "text-rose-600" : "text-emerald-600"} />
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
