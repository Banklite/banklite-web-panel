"use client";

import { useEffect, useMemo, useState } from "react";
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
  Usuario,
  createBeneficiary,
  createRail,
  createTransfer,
  getLedgerBalance,
  listAccounts,
  listBeneficiaries,
  listRails,
  listTransfers,
  listUsuarios,
} from "@/lib/api";
import { ArrowRight, Loader2, Send, Wallet } from "lucide-react";

type Feedback = { kind: "success" | "error"; text: string } | null;

function formatCOP(v: string | number | null | undefined): string {
  if (v == null) return "$ 0";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (Number.isNaN(n)) return "$ 0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

const MONTO_RAPIDO = [10000, 50000, 100000, 500000, 1000000];

export default function EnviarDineroPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [rieles, setRieles] = useState<RielPago[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [saldos, setSaldos] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const [origenId, setOrigenId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");

  async function refresh() {
    try {
      const [u, c, r, b, t] = await Promise.all([
        listUsuarios(),
        listAccounts(),
        listRails(),
        listBeneficiaries(),
        listTransfers(10, 0),
      ]);
      setUsuarios(u);
      setCuentas(c.filter((x) => x.estado === "activa"));
      setRieles(r);
      setBeneficiarios(b);
      setTransferencias(t);

      const activas = c.filter((x) => x.estado === "activa");
      const balances = await Promise.all(
        activas.map(async (x) => {
          try {
            const ledger = await getLedgerBalance(x.id_cuenta);
            return [x.id_cuenta, ledger?.saldo_actual ?? "0"] as const;
          } catch {
            return [x.id_cuenta, "0"] as const;
          }
        })
      );
      setSaldos(Object.fromEntries(balances));
    } catch (err) {
      if (err instanceof ApiError) {
        setFeedback({ kind: "error", text: `(${err.status}) ${err.message}` });
      } else if (err instanceof Error) {
        setFeedback({ kind: "error", text: `No se pudo conectar: ${err.message}. ¿Está docker compose corriendo?` });
      }
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const cuentaOrigen = cuentas.find((c) => c.id_cuenta === origenId);
  const cuentaDestino = cuentas.find((c) => c.id_cuenta === destinoId);
  const saldoOrigen = parseFloat(saldos[origenId] ?? "0");
  const montoNum = parseFloat(monto);
  const montoValido = !Number.isNaN(montoNum) && montoNum > 0;
  const saldoInsuficiente = montoValido && cuentaOrigen && montoNum > saldoOrigen;

  const nombreUsuario = (id: string) => {
    const u = usuarios.find((x) => x.id_usuario === id);
    return u ? `${u.nombre} ${u.apellido ?? ""}`.trim() : short(id);
  };

  const cuentasDestino = useMemo(
    () => cuentas.filter((c) => c.id_cuenta !== origenId),
    [cuentas, origenId]
  );

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!cuentaOrigen || !cuentaDestino || !montoValido) {
      setFeedback({ kind: "error", text: "Completa origen, destino y monto." });
      return;
    }

    setEnviando(true);
    try {
      // 1. Buscar o crear el riel "interno"
      let riel = rieles.find((r) => r.tipo === "interno" && r.activo);
      if (!riel) {
        riel = await createRail({ tipo: "interno" });
      }

      // 2. Buscar o crear el beneficiario para esta cuenta destino
      let beneficiario = beneficiarios.find(
        (b) => b.cuenta_destino === cuentaDestino.id_cuenta
      );
      if (!beneficiario) {
        beneficiario = await createBeneficiary({
          id_usuario: cuentaOrigen.id_usuario,
          nombre: `Cuenta ${cuentaDestino.numero_cuenta ?? short(cuentaDestino.id_cuenta)} — ${nombreUsuario(cuentaDestino.id_usuario)}`,
          cuenta_destino: cuentaDestino.id_cuenta,
          banco_destino: "BankLite",
        });
      }

      // 3. Ejecutar la transferencia real
      const result = await createTransfer({
        id_cuenta_origen: cuentaOrigen.id_cuenta,
        id_beneficiario: beneficiario.id_beneficiario,
        id_riel: riel.id_riel,
        monto: monto,
        concepto: concepto || undefined,
      });

      setFeedback({
        kind: "success",
        text: `Transferencia ${result.transferencia.estado}: ${formatCOP(monto)} de ${nombreUsuario(cuentaOrigen.id_usuario)} a ${nombreUsuario(cuentaDestino.id_usuario)}. Partida doble registrada (${short(result.id_transaccion_ledger)}).`,
      });
      setMonto("");
      setConcepto("");
      await refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setFeedback({ kind: "error", text: `(${err.status}) ${err.message}` });
      } else if (err instanceof Error) {
        setFeedback({ kind: "error", text: `No se pudo enviar: ${err.message}` });
      } else {
        setFeedback({ kind: "error", text: "Ocurrió un error inesperado." });
      }
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-32 text-slate-400 text-sm">
        <Loader2 size={22} className="animate-spin mr-2" /> Cargando cuentas disponibles…
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Enviar Dinero</h2>
          <p className="text-slate-500 text-sm mt-1">
            Transferencia interna rápida entre cuentas activas de BankLite — el riel y el beneficiario se crean solos si no existen
          </p>
        </div>
      </div>

      {feedback && <Banner kind={feedback.kind} text={feedback.text} />}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Cuentas origen con saldo */}
        <Card title="Cuentas disponibles (origen)" subtitle="GET /accounts + GET /ledger/accounts/{id}">
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {cuentas.length === 0 && (
              <p className="text-sm text-slate-400 py-6 text-center">No hay cuentas activas. Abre una en "Cuentas Bancarias".</p>
            )}
            {cuentas.map((c) => {
              const activo = c.id_cuenta === origenId;
              return (
                <button
                  key={c.id_cuenta}
                  onClick={() => { setOrigenId(c.id_cuenta); setDestinoId(""); }}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                    activo
                      ? "border-brand-400 bg-brand-50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{nombreUsuario(c.id_usuario)}</p>
                      <p className="text-xs text-slate-500 font-mono">
                        {c.numero_cuenta ?? short(c.id_cuenta)} · {c.tipo_cuenta} · {c.moneda}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-slate-900 whitespace-nowrap">{formatCOP(saldos[c.id_cuenta])}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Formulario de envío */}
        <Card title="Enviar" subtitle="POST /beneficiaries + POST /payment-rails + POST /transfers">
          {cuentas.length < 2 ? (
            <p className="text-sm text-slate-400 py-6 text-center">
              Se necesitan al menos 2 cuentas activas para poder transferir.
            </p>
          ) : (
            <form onSubmit={handleEnviar} className="space-y-4">
              <div>
                <span className="block text-sm font-semibold text-slate-700 mb-1">De (origen)</span>
                {cuentaOrigen ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">{nombreUsuario(cuentaOrigen.id_usuario)}</p>
                      <p className="text-xs text-emerald-700 font-mono">{cuentaOrigen.numero_cuenta ?? short(cuentaOrigen.id_cuenta)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-emerald-600">Saldo</p>
                      <p className="text-sm font-bold text-emerald-900">{formatCOP(saldoOrigen)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl px-4 py-3">
                    Selecciona una cuenta de la lista de la izquierda.
                  </p>
                )}
              </div>

              <div className="flex justify-center">
                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <ArrowRight size={16} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Para (destino)</label>
                <select
                  value={destinoId}
                  onChange={(e) => setDestinoId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white"
                >
                  <option value="">Selecciona la cuenta destino…</option>
                  {cuentasDestino.map((c) => (
                    <option key={c.id_cuenta} value={c.id_cuenta}>
                      {nombreUsuario(c.id_usuario)} — {c.numero_cuenta ?? short(c.id_cuenta)} ({c.tipo_cuenta})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Monto (COP)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="Ej: 50000"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm"
                />
                <div className="flex gap-2 mt-2 flex-wrap">
                  {MONTO_RAPIDO.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setMonto(String(v))}
                      className="px-3 py-1 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition"
                    >
                      {formatCOP(v)}
                    </button>
                  ))}
                </div>
                {saldoInsuficiente && (
                  <p className="text-xs text-red-500 mt-1 font-medium">
                    Saldo insuficiente en la cuenta origen ({formatCOP(saldoOrigen)} disponibles).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Concepto (opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Pago de nómina, transferencia a ahorros…"
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  maxLength={140}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={enviando || !origenId || !destinoId || !montoValido || saldoInsuficiente}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition"
              >
                {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {enviando ? "Enviando…" : "Enviar dinero"}
              </button>
            </form>
          )}
        </Card>
      </div>

      {/* Últimas transferencias */}
      <Card title="Últimas transferencias" subtitle="GET /transfers">
        {transferencias.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">Aún no hay transferencias registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="py-1 pr-3">Origen</th>
                  <th className="py-1 pr-3">Destino</th>
                  <th className="py-1 pr-3">Monto</th>
                  <th className="py-1 pr-3">Estado</th>
                  <th className="py-1 pr-3">Hora</th>
                </tr>
              </thead>
              <tbody>
                {transferencias.map((t) => {
                  const cOrigen = cuentas.find((c) => c.id_cuenta === t.id_cuenta_origen);
                  const benef = beneficiarios.find((b) => b.id_beneficiario === t.id_beneficiario);
                  const cDestino = benef ? cuentas.find((c) => c.id_cuenta === benef.cuenta_destino) : null;
                  return (
                    <tr key={t.id_transferencia} className="border-b border-slate-50">
                      <td className="py-1.5 pr-3">{cOrigen ? nombreUsuario(cOrigen.id_usuario) : short(t.id_cuenta_origen)}</td>
                      <td className="py-1.5 pr-3">
                        {cDestino ? nombreUsuario(cDestino.id_usuario) : (benef?.nombre ?? short(t.id_beneficiario))}
                      </td>
                      <td className="py-1.5 pr-3 font-medium">{formatCOP(t.monto)}</td>
                      <td className="py-1.5 pr-3"><StatusPill value={t.estado} /></td>
                      <td className="py-1.5 pr-3 text-slate-500 text-xs">{new Date(t.fecha_solicitud).toLocaleTimeString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
