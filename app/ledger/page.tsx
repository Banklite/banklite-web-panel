"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { Banner } from "@/components/Banner";
import { Field } from "@/components/Field";
import { FlowBanner } from "@/components/FlowBanner";
import {
  ApiError,
  Cuenta,
  CuentaContable,
  Usuario,
  depositar,
  getLedgerBalance,
  listAccounts,
  listUsuarios,
} from "@/lib/api";

type Feedback = { kind: "success" | "error"; text: string } | null;

export default function LedgerPage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [saldoCuentaId, setSaldoCuentaId] = useState("");
  const [saldo, setSaldo] = useState<CuentaContable | null | "sin-movimientos">(null);

  const [depositoCuentaId, setDepositoCuentaId] = useState("");
  const [depositoMonto, setDepositoMonto] = useState("100000");

  useEffect(() => {
    Promise.all([listAccounts(), listUsuarios()])
      .then(([c, u]) => {
        setCuentas(c);
        setUsuarios(u);
      })
      .catch(showError);
  }, []);

  // Identifica la cuenta por el nombre del cliente dueño, no por su UUID.
  function nombreCuenta(c: Cuenta): string {
    const u = usuarios.find((u) => u.id_usuario === c.id_usuario);
    const nombre = u ? [u.nombre, u.apellido].filter(Boolean).join(" ") || u.email : "Cliente desconocido";
    return `${nombre} — ${c.moneda} (${c.estado})`;
  }

  function showError(err: unknown) {
    if (err instanceof ApiError) {
      setFeedback({ kind: "error", text: `(${err.status}) ${err.message}` });
    } else if (err instanceof Error) {
      setFeedback({
        kind: "error",
        text: `No se pudo conectar con ledger-service: ${err.message}. ¿Está corriendo con docker compose?`,
      });
    } else {
      setFeedback({ kind: "error", text: "Ocurrió un error inesperado." });
    }
  }

  async function handleVerSaldo(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!saldoCuentaId) {
      setFeedback({ kind: "error", text: "Selecciona una cuenta primero." });
      return;
    }
    try {
      const resultado = await getLedgerBalance(saldoCuentaId);
      setSaldo(resultado ?? "sin-movimientos");
    } catch (err) {
      showError(err);
    }
  }

  async function handleDepositar(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!depositoCuentaId) {
      setFeedback({ kind: "error", text: "Selecciona una cuenta primero." });
      return;
    }
    try {
      await depositar(depositoCuentaId, depositoMonto);
      setFeedback({
        kind: "success",
        text: `Depósito de ${depositoMonto} registrado en ledger-service (cuenta_contable actualizada).`,
      });
      if (saldoCuentaId === depositoCuentaId) {
        const resultado = await getLedgerBalance(depositoCuentaId);
        setSaldo(resultado ?? "sin-movimientos");
      }
    } catch (err) {
      showError(err);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Ledger Contable</h2>
          <p className="text-slate-500 text-sm mt-1">
            Libro mayor distribuido y motor de partida doble (ledger-service)
          </p>
        </div>
      </div>

      {feedback && <Banner kind={feedback.kind} text={feedback.text} />}

      <FlowBanner
        steps={[
          "Una cuenta nueva empieza en saldo 0 — primero deposita fondos de prueba.",
          "Luego puedes consultar el saldo cuando quieras: se recalcula sumando débitos y créditos (partida doble).",
        ]}
      />

      {cuentas.length === 0 && (
        <p className="text-sm text-slate-400">
          Todavía no hay cuentas — ábrelas primero en la sección Cuentas.
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Ver saldo" subtitle="GET /ledger/accounts/{id}">
          <form onSubmit={handleVerSaldo} className="space-y-3">
            <Field label="Cuenta" hint="El saldo se calcula a partir de los asientos contables de esta cuenta.">
            <select
              value={saldoCuentaId}
              onChange={(e) => setSaldoCuentaId(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Selecciona una cuenta…</option>
              {cuentas.map((c) => (
                <option key={c.id_cuenta} value={c.id_cuenta}>
                  {nombreCuenta(c)}
                </option>
              ))}
            </select>
            </Field>
            <button
              type="submit"
              className="bg-brand-600 hover:bg-brand-700 text-white rounded-md px-4 py-2 text-sm font-medium"
            >
              Consultar saldo
            </button>
            {saldo === "sin-movimientos" && (
              <p className="text-sm text-slate-400">
                Esta cuenta todavía no tiene movimientos en el ledger.
              </p>
            )}
            {saldo && saldo !== "sin-movimientos" && (
              <p className="text-sm text-slate-700">
                Saldo actual:{" "}
                <span className="font-semibold text-lg text-amber-600">
                  {saldo.saldo_actual} {saldo.moneda}
                </span>
              </p>
            )}
          </form>
        </Card>

        <Card
          title="Depositar fondos de prueba"
          subtitle="POST /ledger/entries (atajo: acredita la cuenta y debita la cuenta puente)"
        >
          <form onSubmit={handleDepositar} className="space-y-3">
            <Field label="Cuenta destino">
              <select
                value={depositoCuentaId}
                onChange={(e) => setDepositoCuentaId(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Selecciona una cuenta…</option>
                {cuentas.map((c) => (
                  <option key={c.id_cuenta} value={c.id_cuenta}>
                    {nombreCuenta(c)}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Monto a depositar"
              hint="Necesario antes de poder transferir: una cuenta nueva empieza en 0."
            >
              <input
                type="number"
                min="1"
                step="1"
                value={depositoMonto}
                onChange={(e) => setDepositoMonto(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
            </Field>
            <button
              type="submit"
              className="bg-brand-600 hover:bg-brand-700 text-white rounded-md px-4 py-2 text-sm font-medium"
            >
              Depositar
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
