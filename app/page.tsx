"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatCard } from "@/components/StatCard";
import { Users, CreditCard, ArrowRightLeft, ShieldCheck, BookOpen } from "lucide-react";
import {
  Usuario,
  Cuenta,
  Transferencia,
  TransferenciaRecibida,
  listUsuarios,
  listAccounts,
  listTransfers,
  listTransfersReceived,
} from "@/lib/api";

const SECCIONES = [
  {
    href: "/identidad",
    titulo: "Módulo de Identidad",
    icon: Users,
    color: "bg-indigo-50 text-indigo-600 ring-indigo-500/30",
    hover: "hover:border-indigo-300 hover:ring-2 hover:ring-indigo-100",
    descripcion: "Onboarding, KYC y perfiles. (identity-service)",
  },
  {
    href: "/cuentas",
    titulo: "Módulo de Cuentas",
    icon: CreditCard,
    color: "bg-emerald-50 text-emerald-600 ring-emerald-500/30",
    hover: "hover:border-emerald-300 hover:ring-2 hover:ring-emerald-100",
    descripcion: "Gestión de productos y límites. (account-service)",
  },
  {
    href: "/ledger",
    titulo: "Core Bancario (Ledger)",
    icon: BookOpen,
    color: "bg-amber-50 text-amber-600 ring-amber-500/30",
    hover: "hover:border-amber-300 hover:ring-2 hover:ring-amber-100",
    descripcion: "Motor transaccional y partida doble. (ledger-service)",
  },
  {
    href: "/transferencias",
    titulo: "Switch de Transferencias",
    icon: ArrowRightLeft,
    color: "bg-sky-50 text-sky-600 ring-sky-500/30",
    hover: "hover:border-sky-300 hover:ring-2 hover:ring-sky-100",
    descripcion: "Rieles de pago y automatización. (transfer-service)",
  },
];

export default function Home() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [recibidas, setRecibidas] = useState<TransferenciaRecibida[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listUsuarios(), listAccounts(), listTransfers(), listTransfersReceived()])
      .then(([u, c, t, r]) => {
        setUsuarios(u);
        setCuentas(c);
        setTransferencias(t);
        setRecibidas(r);
      })
      .catch(() =>
        setError(
          "Error de conexión con los microservicios. Verifique que los contenedores estén corriendo."
        )
      )
      .finally(() => setLoading(false));
  }, []);

  const verificados = usuarios.filter((u) => u.estado === "verificado").length;
  const cuentasActivas = cuentas.filter((c) => c.estado === "activa").length;
  const transferenciasCompletadas = transferencias.filter((t) => t.estado === "completada").length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Visión Global del Sistema</h1>
        <p className="text-slate-500 mt-1">
          Monitor de operaciones en tiempo real. Todos los microservicios operando de forma autónoma.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-red-50 text-red-700 border-red-200">
          <ShieldCheck className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Usuarios Registrados" value={loading ? "…" : usuarios.length} accent="text-slate-900" />
        <StatCard label="KYC Aprobados" value={loading ? "…" : verificados} accent="text-indigo-600" />
        <StatCard label="Cuentas Activas" value={loading ? "…" : cuentasActivas} accent="text-emerald-600" />
        <StatCard label="Transacciones Exitosas" value={loading ? "…" : transferenciasCompletadas} accent="text-sky-600" />
      </div>

      {/* Access Modules */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Centros de Operación</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SECCIONES.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className={`group flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 p-5 transition-all ${s.hover}`}
            >
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ring-1 mb-4 ${s.color}`}>
                <s.icon size={22} />
              </div>
              <h4 className="text-base font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">{s.titulo}</h4>
              <p className="text-sm text-slate-500 flex-1">{s.descripcion}</p>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 group-hover:text-indigo-500">Ingresar al módulo</span>
                <ArrowRightLeft size={14} className="text-slate-300 group-hover:text-indigo-500" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Real-time feed */}
      {recibidas.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">
            Auditoría: Eventos Consumidos (RabbitMQ)
          </h3>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {recibidas
                .slice(-5)
                .reverse()
                .map((r) => (
                  <li key={r.id_transferencia} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <ArrowRightLeft size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          Transferencia acreditada
                        </p>
                        <p className="text-xs text-slate-500">
                          Cuenta destino: <span className="font-mono text-slate-700">{r.id_cuenta_origen.slice(0, 8)}…</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">${r.monto}</p>
                      <p className="text-xs text-slate-400">{new Date(r.recibido_en).toLocaleTimeString()}</p>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
