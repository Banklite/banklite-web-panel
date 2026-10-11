"use client";
import { useEffect, useState } from "react";
import { obtenerSesion } from "@/lib/auth";
import { fetchAdminStats, AdminStats } from "@/lib/api";
import {
  Users, Wallet, CreditCard, ShieldAlert, BookOpen, ArrowRightLeft,
  Activity, Bell, BarChart3, ArrowUpRight, AlertTriangle
} from "lucide-react";
import Link from "next/link";

const MODULOS = [
  {
    href: "/admin/usuarios", title: "Identidad & KYC", desc: "Registrar usuarios y verificar documentos de identidad",
    icon: Users, color: "bg-violet-500", ring: "ring-violet-200",
  },
  {
    href: "/admin/cuentas", title: "Cuentas Bancarias", desc: "Abrir cuentas, gestionar estados y ver limites operativos",
    icon: Wallet, color: "bg-brand-500", ring: "ring-brand-100",
  },
  {
    href: "/admin/tarjetas", title: "Tarjetas & Pagos", desc: "Emitir tarjetas, bloqueos y autorizaciones",
    icon: CreditCard, color: "bg-brand-700", ring: "ring-brand-100",
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
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = obtenerSesion();
    if (s) setNombre(s.usuario.nombre);
    fetchAdminStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Bienvenida */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 text-white p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <Activity size={28} className="opacity-80" />
          <span className="text-brand-100 text-sm font-bold uppercase tracking-widest">Centro de Operaciones</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight">Bienvenido, {nombre}</h1>
        <p className="text-brand-100 mt-2 text-lg">
          Tienes acceso completo a todos los modulos de BankLite Core Banking.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Usuarios"
          value={stats?.identity.total_usuarios}
          sub={stats ? `${stats.identity.usuarios_aprobados} aprobados` : ""}
          icon={Users}
          color="text-violet-600"
          bg="bg-violet-50"
          loading={loading}
          href="/admin/usuarios"
        />
        <KpiCard
          label="Cuentas"
          value={stats?.account.total_cuentas}
          sub={stats ? `${stats.account.cuentas_activas} activas` : ""}
          icon={Wallet}
          color="text-brand-600"
          bg="bg-brand-50"
          loading={loading}
          href="/admin/cuentas"
        />
        <KpiCard
          label="Transferencias hoy"
          value={stats?.transfer.transferencias_hoy}
          sub={stats ? `${stats.transfer.total_transferencias} totales` : ""}
          icon={ArrowRightLeft}
          color="text-emerald-600"
          bg="bg-emerald-50"
          loading={loading}
          href="/admin/transferencias"
        />
        <KpiCard
          label="Alertas fraude"
          value={stats?.fraud.alertas_pendientes}
          sub={stats ? `${stats.fraud.total_alertas} totales` : ""}
          icon={AlertTriangle}
          color="text-rose-600"
          bg="bg-rose-50"
          loading={loading}
          href="/admin/fraude"
          highlight={!!stats && stats.fraud.alertas_pendientes > 0}
        />
      </div>

      {/* Fila secundaria */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
          <CreditCard size={24} className="text-brand-700" />
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Tarjetas</p>
            <p className="text-xl font-black text-slate-800">{loading ? "—" : stats?.card.total_tarjetas ?? 0}</p>
            <p className="text-xs text-slate-500">{loading ? "" : `${stats?.card.tarjetas_activas ?? 0} activas`}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
          <BookOpen size={24} className="text-amber-500" />
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Asientos ledger</p>
            <p className="text-xl font-black text-slate-800">{loading ? "—" : stats?.ledger.total_transacciones ?? 0}</p>
            <p className="text-xs text-slate-500">Partida doble</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
          <BarChart3 size={24} className="text-brand-600" />
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Microservicios</p>
            <p className="text-xl font-black text-slate-800">7</p>
            <p className="text-xs text-slate-500">REST sync</p>
          </div>
        </div>
      </div>

      {/* Usuarios pendientes */}
      {stats && stats.identity.usuarios_pendientes > 0 && (
        <Link
          href="/admin/usuarios"
          className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
        >
          <Bell size={20} className="text-amber-600" />
          <span className="text-sm font-semibold text-amber-800">
            {stats.identity.usuarios_pendientes} usuario(s) pendientes de verificacion KYC
          </span>
          <ArrowUpRight size={16} className="text-amber-600 ml-auto" />
        </Link>
      )}

      {/* Modulos */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Modulos del Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULOS.map((mod) => (
            <Link
              key={mod.href}
              href={mod.href}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group"
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

function KpiCard({
  label, value, sub, icon: Icon, color, bg, loading, href, highlight,
}: {
  label: string;
  value: number | undefined;
  sub: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  loading: boolean;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link href={href} className={`bg-white rounded-2xl p-5 shadow-sm border ${highlight ? "border-rose-300 ring-2 ring-rose-100" : "border-slate-100"} hover:shadow-md transition-all group`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`h-10 w-10 rounded-xl ${bg} flex items-center justify-center`}>
          <Icon size={20} className={color} />
        </div>
        <ArrowUpRight size={16} className="text-slate-300 group-hover:text-brand-500 transition-colors" />
      </div>
      <p className="text-2xl font-black text-slate-800">
        {loading ? <span className="inline-block w-10 h-7 bg-slate-200 rounded animate-pulse" /> : (value ?? 0)}
      </p>
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">{label}</p>
      <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
    </Link>
  );
}
