"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatCard } from "@/components/StatCard";
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
    titulo: "Identidad",
    accent: "border-indigo-400",
    badge: "bg-indigo-100 text-indigo-700",
    descripcion:
      "Registrar usuarios y verificar su identidad (KYC). identity-service · puerto 8001.",
  },
  {
    href: "/cuentas",
    titulo: "Cuentas",
    accent: "border-emerald-400",
    badge: "bg-emerald-100 text-emerald-700",
    descripcion:
      "Abrir cuentas, cambiar su estado y consultar límites operativos. account-service · puerto 8002.",
  },
  {
    href: "/ledger",
    titulo: "Ledger",
    accent: "border-amber-400",
    badge: "bg-amber-100 text-amber-700",
    descripcion:
      "Consultar saldos y depositar fondos de prueba con partida doble. ledger-service · puerto 8003.",
  },
  {
    href: "/transferencias",
    titulo: "Transferencias",
    accent: "border-sky-400",
    badge: "bg-sky-100 text-sky-700",
    descripcion:
      "Rieles de pago, beneficiarios y transferencias. transfer-service · puerto 8004.",
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
          "No se pudo conectar con los servicios. ¿Están corriendo con docker compose?"
        )
      )
      .finally(() => setLoading(false));
  }, []);

  const verificados = usuarios.filter((u) => u.estado === "verificado").length;
  const cuentasActivas = cuentas.filter((c) => c.estado === "activa").length;
  const transferenciasCompletadas = transferencias.filter((t) => t.estado === "completada").length;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800">Resumen</h2>
        <p className="text-slate-500 text-sm mt-1">
          Estado actual de los cuatro microservicios ya implementados.
        </p>
      </div>

      {error && (
        <div className="text-sm px-3 py-2 rounded-md border bg-red-50 text-red-700 border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Usuarios" value={loading ? "…" : usuarios.length} accent="text-indigo-600" />
        <StatCard label="Verificados" value={loading ? "…" : verificados} accent="text-indigo-600" />
        <StatCard label="Cuentas activas" value={loading ? "…" : cuentasActivas} accent="text-emerald-600" />
        <StatCard
          label="Transferencias"
          value={loading ? "…" : transferenciasCompletadas}
          accent="text-sky-600"
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-slate-700 mb-3">Accesos rápidos</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {SECCIONES.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className={`block bg-white rounded-xl shadow-sm border-l-4 ${s.accent} border-y border-r border-slate-200 p-5 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold text-slate-800">{s.titulo}</h4>
                <span className={`text-xs px-2 py-0.5 rounded-full ${s.badge}`}>abrir →</span>
              </div>
              <p className="text-sm text-slate-500 mt-2">{s.descripcion}</p>
            </Link>
          ))}
        </div>
      </div>

      {recibidas.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-700 mb-3">
            Última actividad recibida (proyección asíncrona)
          </h3>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <ul className="divide-y divide-slate-100 text-sm">
              {recibidas
                .slice(-5)
                .reverse()
                .map((r) => (
                  <li key={r.id_transferencia} className="py-2 flex justify-between">
                    <span>Transferencia recibida por cuenta {r.id_cuenta_origen.slice(0, 8)}…</span>
                    <span className="text-slate-400">{new Date(r.recibido_en).toLocaleString()}</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
