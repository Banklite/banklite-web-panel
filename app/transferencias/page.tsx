"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { Banner } from "@/components/Banner";
import { StatusPill } from "@/components/StatusPill";
import { short } from "@/lib/format";
import {
  ApiError,
  Beneficiario,
  Cuenta,
  RielPago,
  Transferencia,
  TransferenciaRecibida,
  Usuario,
  createBeneficiary,
  createRail,
  createTransfer,
  listAccounts,
  listBeneficiaries,
  listRails,
  listTransfers,
  listTransfersReceived,
  listUsuarios,
} from "@/lib/api";

const TIPOS_RIEL = ["interno", "ACH", "SWIFT"];
const PAISES = ["CO", "MX", "US", "ES", "PE"];

type Feedback = { kind: "success" | "error"; text: string } | null;

export default function TransferenciasPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [rieles, setRieles] = useState<RielPago[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [transferenciasRecibidas, setTransferenciasRecibidas] = useState<TransferenciaRecibida[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [rielTipo, setRielTipo] = useState("interno");
  const [rielPais, setRielPais] = useState("CO");

  const [benefUsuarioId, setBenefUsuarioId] = useState("");
  const [benefNombre, setBenefNombre] = useState("");
  const [benefEsInterno, setBenefEsInterno] = useState(true);
  const [benefCuentaInterna, setBenefCuentaInterna] = useState("");
  const [benefCuentaExterna, setBenefCuentaExterna] = useState("");
  const [benefBancoDestino, setBenefBancoDestino] = useState("");

  const [transferCuentaOrigen, setTransferCuentaOrigen] = useState("");
  const [transferBeneficiario, setTransferBeneficiario] = useState("");
  const [transferRiel, setTransferRiel] = useState("");
  const [transferMonto, setTransferMonto] = useState("");

  async function refresh() {
    try {
      const [u, c, r, b, t, tr] = await Promise.all([
        listUsuarios(),
        listAccounts(),
        listRails(),
        listBeneficiaries(),
        listTransfers(),
        listTransfersReceived(),
      ]);
      setUsuarios(u);
      setCuentas(c);
      setRieles(r);
      setBeneficiarios(b);
      setTransferencias(t);
      setTransferenciasRecibidas(tr);
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
        text: `No se pudo conectar con transfer-service: ${err.message}. ¿Está corriendo con docker compose?`,
      });
    } else {
      setFeedback({ kind: "error", text: "Ocurrió un error inesperado." });
    }
  }

  async function handleCreateRiel(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      const riel = await createRail({ tipo: rielTipo, pais: rielPais || undefined });
      setFeedback({ kind: "success", text: `Riel de pago creado: ${riel.tipo} (${riel.id_riel}).` });
      await refresh();
    } catch (err) {
      showError(err);
    }
  }

  async function handleCreateBeneficiario(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!benefUsuarioId) {
      setFeedback({ kind: "error", text: "Selecciona a qué usuario le pertenece este beneficiario." });
      return;
    }
    const cuentaDestino = benefEsInterno ? benefCuentaInterna : benefCuentaExterna;
    if (!cuentaDestino) {
      setFeedback({ kind: "error", text: "Falta la cuenta destino del beneficiario." });
      return;
    }
    try {
      const benef = await createBeneficiary({
        id_usuario: benefUsuarioId,
        nombre: benefNombre || undefined,
        cuenta_destino: cuentaDestino,
        banco_destino: benefEsInterno ? "BankLite" : benefBancoDestino || undefined,
      });
      setFeedback({ kind: "success", text: `Beneficiario creado: ${benef.nombre ?? short(benef.id_beneficiario)}.` });
      setBenefNombre("");
      setBenefCuentaExterna("");
      setBenefBancoDestino("");
      await refresh();
    } catch (err) {
      showError(err);
    }
  }

  async function handleCreateTransfer(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!transferCuentaOrigen || !transferBeneficiario || !transferRiel) {
      setFeedback({ kind: "error", text: "Completa cuenta origen, beneficiario y riel." });
      return;
    }
    try {
      const result = await createTransfer({
        id_cuenta_origen: transferCuentaOrigen,
        id_beneficiario: transferBeneficiario,
        id_riel: transferRiel,
        monto: transferMonto,
      });
      setFeedback({
        kind: "success",
        text: `Transferencia ${result.transferencia.estado}. Partida doble registrada en ledger-service (transacción ${short(result.id_transaccion_ledger)}). Evento transfer.completed publicado: ${result.event_published ? "sí" : "no"}.`,
      });
      setTransferMonto("");
      await refresh();
    } catch (err) {
      showError(err);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800">Transferencias</h2>
        <p className="text-slate-500 text-sm mt-1">
          transfer-service · puerto 8004 · tablas transferencia, beneficiario, riel_pago, transferencia_programada
        </p>
      </div>

      {feedback && <Banner kind={feedback.kind} text={feedback.text} />}

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Catálogo — rieles de pago" subtitle="POST/GET /payment-rails">
          <form onSubmit={handleCreateRiel} className="space-y-3 mb-4">
            <div className="flex gap-2">
              <select
                value={rielTipo}
                onChange={(e) => setRielTipo(e.target.value)}
                className="w-1/2 border border-slate-300 rounded-md px-3 py-2 text-sm"
              >
                {TIPOS_RIEL.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                value={rielPais}
                onChange={(e) => setRielPais(e.target.value)}
                className="w-1/2 border border-slate-300 rounded-md px-3 py-2 text-sm"
              >
                {PAISES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="bg-brand-600 hover:bg-brand-700 text-white rounded-md px-4 py-2 text-sm font-medium"
            >
              Crear riel
            </button>
          </form>
          <RielesTable rieles={rieles} />
        </Card>

        <Card title="Catálogo — beneficiarios" subtitle="POST/GET /beneficiaries">
          <form onSubmit={handleCreateBeneficiario} className="space-y-3 mb-4">
            <select
              value={benefUsuarioId}
              onChange={(e) => setBenefUsuarioId(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">¿A qué usuario le pertenece este beneficiario?</option>
              {usuarios.map((u) => (
                <option key={u.id_usuario} value={u.id_usuario}>
                  {u.email}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Nombre del beneficiario (opcional)"
              value={benefNombre}
              onChange={(e) => setBenefNombre(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={benefEsInterno}
                onChange={(e) => setBenefEsInterno(e.target.checked)}
              />
              Es una cuenta dentro de BankLite (riel interno)
            </label>
            {benefEsInterno ? (
              <select
                value={benefCuentaInterna}
                onChange={(e) => setBenefCuentaInterna(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Selecciona la cuenta destino…</option>
                {cuentas.map((c) => (
                  <option key={c.id_cuenta} value={c.id_cuenta}>
                    {short(c.id_cuenta)} ({c.moneda})
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Número de cuenta externa"
                  value={benefCuentaExterna}
                  onChange={(e) => setBenefCuentaExterna(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Banco destino (opcional)"
                  value={benefBancoDestino}
                  onChange={(e) => setBenefBancoDestino(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                />
              </>
            )}
            <button
              type="submit"
              className="bg-brand-600 hover:bg-brand-700 text-white rounded-md px-4 py-2 text-sm font-medium"
            >
              Crear beneficiario
            </button>
          </form>
          <BeneficiariosTable beneficiarios={beneficiarios} />
        </Card>
      </div>

      <Card
        title="Hacer una transferencia"
        subtitle="POST /transfers (síncrono con account-service y ledger-service)"
      >
        <form onSubmit={handleCreateTransfer} className="grid md:grid-cols-2 gap-3 md:items-end">
          <select
            value={transferCuentaOrigen}
            onChange={(e) => setTransferCuentaOrigen(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Cuenta origen…</option>
            {cuentas.map((c) => (
              <option key={c.id_cuenta} value={c.id_cuenta}>
                {short(c.id_cuenta)} ({c.moneda})
              </option>
            ))}
          </select>
          <select
            value={transferBeneficiario}
            onChange={(e) => setTransferBeneficiario(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Beneficiario…</option>
            {beneficiarios.map((b) => (
              <option key={b.id_beneficiario} value={b.id_beneficiario}>
                {b.nombre ?? short(b.id_beneficiario)}
              </option>
            ))}
          </select>
          <select
            value={transferRiel}
            onChange={(e) => setTransferRiel(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Riel de pago…</option>
            {rieles.map((r) => (
              <option key={r.id_riel} value={r.id_riel}>
                {r.tipo} {r.pais ? `(${r.pais})` : ""}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            step="1"
            required
            placeholder="Monto"
            value={transferMonto}
            onChange={(e) => setTransferMonto(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="bg-brand-600 hover:bg-brand-700 text-white rounded-md px-4 py-2 text-sm font-medium md:col-span-2 md:w-fit"
          >
            Transferir
          </button>
        </form>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Transferencias" subtitle="GET /transfers">
          <TransferenciasTable transferencias={transferencias} />
        </Card>

        <Card
          title="Proyección asíncrona — transferencias recibidas"
          subtitle="account-service · GET /transfers-received — alimentada solo por el evento transfer.completed"
        >
          <TransferenciasRecibidasTable rows={transferenciasRecibidas} />
        </Card>
      </div>
    </div>
  );
}

function RielesTable({ rieles }: { rieles: RielPago[] }) {
  if (rieles.length === 0) return <p className="text-sm text-slate-400">Aún no hay rieles de pago.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-400 border-b border-slate-100">
            <th className="py-1 pr-2">Tipo</th>
            <th className="py-1 pr-2">País</th>
            <th className="py-1 pr-2">Activo</th>
          </tr>
        </thead>
        <tbody>
          {rieles.map((r) => (
            <tr key={r.id_riel} className="border-b border-slate-50">
              <td className="py-1 pr-2">{r.tipo}</td>
              <td className="py-1 pr-2">{r.pais ?? "—"}</td>
              <td className="py-1 pr-2">{r.activo ? "sí" : "no"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BeneficiariosTable({ beneficiarios }: { beneficiarios: Beneficiario[] }) {
  if (beneficiarios.length === 0)
    return <p className="text-sm text-slate-400">Aún no hay beneficiarios.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-400 border-b border-slate-100">
            <th className="py-1 pr-2">Nombre</th>
            <th className="py-1 pr-2">Cuenta destino</th>
            <th className="py-1 pr-2">Banco</th>
          </tr>
        </thead>
        <tbody>
          {beneficiarios.map((b) => (
            <tr key={b.id_beneficiario} className="border-b border-slate-50">
              <td className="py-1 pr-2">{b.nombre ?? short(b.id_beneficiario)}</td>
              <td className="py-1 pr-2 font-mono text-xs">{short(b.cuenta_destino)}</td>
              <td className="py-1 pr-2">{b.banco_destino ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TransferenciasTable({ transferencias }: { transferencias: Transferencia[] }) {
  if (transferencias.length === 0)
    return <p className="text-sm text-slate-400">Aún no hay transferencias.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-400 border-b border-slate-100">
            <th className="py-1 pr-2">Monto</th>
            <th className="py-1 pr-2">Estado</th>
            <th className="py-1 pr-2">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {transferencias.map((t) => (
            <tr key={t.id_transferencia} className="border-b border-slate-50">
              <td className="py-1 pr-2">{t.monto}</td>
              <td className="py-1 pr-2">
                <StatusPill value={t.estado} />
              </td>
              <td className="py-1 pr-2">{new Date(t.fecha_solicitud).toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TransferenciasRecibidasTable({ rows }: { rows: TransferenciaRecibida[] }) {
  if (rows.length === 0)
    return (
      <p className="text-sm text-slate-400">
        Todavía no llega nada aquí — aparece automáticamente cuando una transferencia se completa.
      </p>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-400 border-b border-slate-100">
            <th className="py-1 pr-2">Monto</th>
            <th className="py-1 pr-2">Estado</th>
            <th className="py-1 pr-2">Recibido</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id_transferencia} className="border-b border-slate-50">
              <td className="py-1 pr-2">{r.monto}</td>
              <td className="py-1 pr-2">
                <StatusPill value={r.estado} />
              </td>
              <td className="py-1 pr-2">{new Date(r.recibido_en).toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
