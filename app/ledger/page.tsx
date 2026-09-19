"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { Banner } from "@/components/Banner";
import {
  ApiError,
  Cuenta,
  CuentaContable,
  depositar,
  getLedgerBalance,
  listAccounts,
} from "@/lib/api";

type Feedback = { kind: "success" | "error"; text: string } | null;

export default function LedgerPage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [saldoCuentaId, setSaldoCuentaId] = useState("");
  const [saldo, setSaldo] = useState<CuentaContable | null | "sin-movimientos">(null);

  const [depositoCuentaId, setDepositoCuentaId] = useState("");
  const [depositoMonto, setDepositoMonto] = useState("100000");

  useEffect(() => {
    listAccounts()
      .then(setCuentas)
      .catch(showError);
  }, []);

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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800">Ledger</h2>
        <p className="text-slate-500 text-sm mt-1">
          ledger-service · puerto 8003 · tablas transaccion, asiento_contable, cuenta_contable — partida doble
        </p>
      </div>

      {feedback && <Banner kind={feedback.kind} text={feedback.text} />}

      {cuentas.length === 0 && (
        <p className="text-sm text-slate-400">
          Todavía no hay cuentas — ábrelas primero en la sección Cuentas.
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Ver saldo" subtitle="GET /ledger/accounts/{id}">
          <form onSubmit={handleVerSaldo} className="space-y-3">
            <select
              value={saldoCuentaId}
              onChange={(e) => setSaldoCuentaId(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Selecciona una cuenta…</option>
              {cuentas.map((c) => (
                <option key={c.id_cuenta} value={c.id_cuenta}>
                  {c.id_cuenta.slice(0, 8)}… ({c.moneda})
                </option>
              ))}
            </select>
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
            <select
              value={depositoCuentaId}
              onChange={(e) => setDepositoCuentaId(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Selecciona una cuenta…</option>
              {cuentas.map((c) => (
                <option key={c.id_cuenta} value={c.id_cuenta}>
                  {c.id_cuenta.slice(0, 8)}… ({c.moneda})
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              step="1"
              value={depositoMonto}
              onChange={(e) => setDepositoMonto(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            />
            <p className="text-xs text-slate-400">
              Necesario antes de poder transferir: una cuenta nueva empieza en 0.
            </p>
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
