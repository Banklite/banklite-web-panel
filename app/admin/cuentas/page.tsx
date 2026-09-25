"use client";

import { Fragment, useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { Banner } from "@/components/Banner";
import { StatusPill } from "@/components/StatusPill";
import { Field } from "@/components/Field";
import { FlowBanner } from "@/components/FlowBanner";
import { short } from "@/lib/format";
import {
  ApiError,
  Cuenta,
  LimiteOperativo,
  Usuario,
  UsuarioVerificado,
  getAccountLimits,
  listAccounts,
  listUsuarios,
  listVerifiedUsers,
  openAccount,
  updateAccountStatus,
} from "@/lib/api";

const ESTADOS_CUENTA = ["activa", "suspendida", "cerrada"];

type Feedback = { kind: "success" | "error"; text: string } | null;

export default function CuentasPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [verificados, setVerificados] = useState<UsuarioVerificado[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [limitesPorCuenta, setLimitesPorCuenta] = useState<Record<string, LimiteOperativo[]>>({});
  const [accountUsuarioId, setAccountUsuarioId] = useState("");

  async function refresh() {
    try {
      const [u, c, v] = await Promise.all([listUsuarios(), listAccounts(), listVerifiedUsers()]);
      setUsuarios(u);
      setCuentas(c);
      setVerificados(v);
    } catch (err) {
      showError(err);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function showError(err: unknown) {
    if (err instanceof ApiError) {
      setFeedback({ kind: "error", text: `(${err.status}) ${err.message}` });
    } else if (err instanceof Error) {
      setFeedback({
        kind: "error",
        text: `No se pudo conectar con account-service: ${err.message}. ¿Está corriendo con docker compose?`,
      });
    } else {
      setFeedback({ kind: "error", text: "Ocurrió un error inesperado." });
    }
  }

  async function handleOpenAccount(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!accountUsuarioId) {
      setFeedback({ kind: "error", text: "Selecciona un usuario primero." });
      return;
    }
    try {
      const result = await openAccount({ id_usuario: accountUsuarioId });
      const limiteDiario = result.limites.find((l) => l.tipo_limite === "diario");
      setFeedback({
        kind: "success",
        text: `Cuenta creada en ${result.cuenta.moneda}, límite diario ${limiteDiario?.monto_maximo}, restricción regulatoria: ${result.restriccion.descripcion}. Validado vía: ${result.validado_via}.`,
      });
      await refresh();
    } catch (err) {
      showError(err);
    }
  }

  async function handleStatusChange(idCuenta: string, estado: string) {
    setFeedback(null);
    try {
      await updateAccountStatus(idCuenta, estado);
      setFeedback({ kind: "success", text: `Cuenta ${short(idCuenta)} ahora está "${estado}".` });
      await refresh();
    } catch (err) {
      showError(err);
    }
  }

  async function handleVerLimites(idCuenta: string) {
    try {
      const limites = await getAccountLimits(idCuenta);
      setLimitesPorCuenta((prev) => ({ ...prev, [idCuenta]: limites }));
    } catch (err) {
      showError(err);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Gestión de Cuentas</h2>
          <p className="text-slate-500 text-sm mt-1">
            Administración de productos financieros y límites operativos (account-service)
          </p>
        </div>
      </div>

      {feedback && <Banner kind={feedback.kind} text={feedback.text} />}

      <FlowBanner
        steps={[
          "Elige un usuario que ya esté verificado (KYC aprobado en la sección Identidad).",
          "Abre la cuenta: el sistema le asigna automáticamente sus límites y una restricción según su país.",
          "Con la cuenta abierta, ya puedes depositar y transferir desde Ledger y Transferencias.",
        ]}
      />

      <Card
        title="Abrir cuenta"
        subtitle="POST /accounts (síncrono con identity-service)"
      >
        <form onSubmit={handleOpenAccount} className="space-y-3 md:w-1/2">
          <Field
            label="Usuario verificado"
            hint="Solo aparecen usuarios con KYC aprobado — si no ves al tuyo, revisa la sección Identidad."
          >
            <select
              value={accountUsuarioId}
              onChange={(e) => setAccountUsuarioId(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
            >
              <option value="">Selecciona un usuario verificado…</option>
              {usuarios
                .filter((u) => u.estado === "verificado")
                .map((u) => (
                  <option key={u.id_usuario} value={u.id_usuario}>
                    {u.email} ({u.pais_residencia})
                  </option>
                ))}
            </select>
          </Field>
          <button
            type="submit"
            className="bg-brand-600 hover:bg-brand-700 text-white rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            Abrir cuenta
          </button>
          {usuarios.filter((u) => u.estado === "verificado").length === 0 && (
            <p className="text-xs text-slate-400">
              No hay usuarios verificados todavía — hazlo primero en la sección Identidad.
            </p>
          )}
        </form>
      </Card>

      <Card
        title="Cuentas"
        subtitle="GET /accounts · PATCH /accounts/{id}/status · GET /accounts/{id}/limits"
      >
        <CuentasTable
          cuentas={cuentas}
          usuarios={usuarios}
          limitesPorCuenta={limitesPorCuenta}
          onStatusChange={handleStatusChange}
          onVerLimites={handleVerLimites}
        />
      </Card>

      <Card
        title="Proyección asíncrona — usuarios verificados"
        subtitle="GET /verified-users · tabla usuario_verificado — alimentada solo por el evento identity.verified vía RabbitMQ"
      >
        <VerificadosTable rows={verificados} />
      </Card>
    </div>
  );
}

function CuentasTable({
  cuentas,
  usuarios,
  limitesPorCuenta,
  onStatusChange,
  onVerLimites,
}: {
  cuentas: Cuenta[];
  usuarios: Usuario[];
  limitesPorCuenta: Record<string, LimiteOperativo[]>;
  onStatusChange: (id: string, estado: string) => void;
  onVerLimites: (id: string) => void;
}) {
  if (cuentas.length === 0) return <p className="text-sm text-slate-400">Aún no hay cuentas.</p>;

  const usuarioPorId = new Map(usuarios.map((u) => [u.id_usuario, u]));
  function nombreCliente(idUsuario: string) {
    const u = usuarioPorId.get(idUsuario);
    if (!u) return short(idUsuario);
    const nombreCompleto = [u.nombre, u.apellido].filter(Boolean).join(" ");
    return nombreCompleto || u.email;
  }

  return (
    <div className="overflow-x-auto space-y-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-400 border-b border-slate-100">
            <th className="py-1 pr-2">Cuenta</th>
            <th className="py-1 pr-2">Cliente</th>
            <th className="py-1 pr-2">Moneda</th>
            <th className="py-1 pr-2">Estado</th>
            <th className="py-1 pr-2">Cambiar a</th>
            <th className="py-1 pr-2">Límite operativo</th>
          </tr>
        </thead>
        <tbody>
          {cuentas.map((c) => (
            <Fragment key={c.id_cuenta}>
              <tr className="border-b border-slate-50">
                <td className="py-1 pr-2 font-mono text-xs text-slate-400">{short(c.id_cuenta)}</td>
                <td className="py-1 pr-2 font-medium text-slate-800">{nombreCliente(c.id_usuario)}</td>
                <td className="py-1 pr-2">{c.moneda}</td>
                <td className="py-1 pr-2">
                  <StatusPill value={c.estado} />
                </td>
                <td className="py-1 pr-2">
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) onStatusChange(c.id_cuenta, e.target.value);
                      e.target.value = "";
                    }}
                    className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                  >
                    <option value="" disabled>
                      elegir…
                    </option>
                    {ESTADOS_CUENTA.filter((s) => s !== c.estado).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-1 pr-2">
                  <button
                    onClick={() => onVerLimites(c.id_cuenta)}
                    className="text-xs text-brand-600 hover:text-brand-700 underline"
                  >
                    ver límites
                  </button>
                </td>
              </tr>
              {limitesPorCuenta[c.id_cuenta] && (
                <tr className="bg-slate-50">
                  <td colSpan={6} className="py-2 px-2 text-xs text-slate-500">
                    <p className="mb-1">
                      {limitesPorCuenta[c.id_cuenta]
                        .map((l) => `${l.tipo_limite}: ${l.monto_maximo} (${l.periodo})`)
                        .join(" · ")}
                    </p>
                    <p className="text-slate-400 italic">
                      Límite regulatorio automático según el país de residencia del cliente — no
                      depende del tipo de cuenta ni del riesgo KYC.
                    </p>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VerificadosTable({ rows }: { rows: UsuarioVerificado[] }) {
  if (rows.length === 0)
    return (
      <p className="text-sm text-slate-400">
        Todavía no llega nada aquí — aparece automáticamente cuando un KYC se aprueba.
      </p>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-400 border-b border-slate-100">
            <th className="py-1 pr-2">Email</th>
            <th className="py-1 pr-2">País</th>
            <th className="py-1 pr-2">Recibido</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id_usuario} className="border-b border-slate-50">
              <td className="py-1 pr-2">{r.email}</td>
              <td className="py-1 pr-2">{r.pais_residencia}</td>
              <td className="py-1 pr-2">{new Date(r.recibido_en).toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
