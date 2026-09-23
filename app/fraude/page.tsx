"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { Banner } from "@/components/Banner";
import { StatusPill } from "@/components/StatusPill";
import { Field } from "@/components/Field";
import { FlowBanner } from "@/components/FlowBanner";
import { short } from "@/lib/format";
import {
  ApiError,
  ReglaFraude,
  EvaluacionFraude,
  AlertaFraude,
  listFraudRules,
  createFraudRule,
  listFraudEvaluations,
  listFraudAlerts,
  resolveFraudAlert,
  evaluateTransactionManual,
} from "@/lib/api";
import { ShieldAlert, AlertTriangle, CheckCircle, Sliders, Activity, Check } from "lucide-react";

type Feedback = { kind: "success" | "error"; text: string } | null;

export default function FraudePage() {
  const [reglas, setReglas] = useState<ReglaFraude[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionFraude[]>([]);
  const [alertas, setAlertas] = useState<AlertaFraude[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Formulario Regla
  const [nombreRegla, setNombreRegla] = useState("L?mite de Riesgo Alto");
  const [tipoRegla, setTipoRegla] = useState("monto_maximo");
  const [umbralRegla, setUmbralRegla] = useState("3000.00");

  // Formulario Evaluaci?n Manual
  const [evalTxId, setEvalTxId] = useState("");
  const [evalMonto, setEvalMonto] = useState("4500.00");

  async function refresh() {
    try {
      const [r, e, a] = await Promise.all([
        listFraudRules().catch(() => []),
        listFraudEvaluations().catch(() => []),
        listFraudAlerts().catch(() => []),
      ]);
      setReglas(r);
      setEvaluaciones(e);
      setAlertas(a);
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
        text: `Error de conexi?n con fraud-service: ${err.message}. ?Est? corriendo en el puerto 8006?`,
      });
    } else {
      setFeedback({ kind: "error", text: "Ocurri? un error inesperado." });
    }
  }

  async function handleCrearRegla(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    const umbralNum = parseFloat(umbralRegla);
    if (isNaN(umbralNum) || umbralNum < 0) {
      setFeedback({ kind: "error", text: "El umbral debe ser un n?mero mayor o igual a 0." });
      return;
    }
    try {
      const res = await createFraudRule({
        nombre: nombreRegla,
        tipo: tipoRegla,
        umbral: umbralNum,
        activa: true,
      });
      setFeedback({
        kind: "success",
        text: `Regla "${res.nombre}" creada con umbral de $${res.umbral.toFixed(2)}.`,
      });
      setNombreRegla("");
      await refresh();
    } catch (err) {
      showError(err);
    }
  }

  async function handleEvaluarManual(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    const montoNum = parseFloat(evalMonto);
    if (isNaN(montoNum) || montoNum <= 0) {
      setFeedback({ kind: "error", text: "Ingresa un monto v?lido mayor a 0." });
      return;
    }
    const txId = evalTxId.trim() || crypto.randomUUID();
    try {
      const res = await evaluateTransactionManual({
        id_transaccion: txId,
        monto_transaccion: montoNum,
      });
      setFeedback({
        kind: res.resultado === "sospechosa" ? "error" : "success",
        text: `Evaluaci?n completada: Resultado "${res.resultado.toUpperCase()}" (Score de Riesgo: ${res.score_riesgo}/100).`,
      });
      await refresh();
    } catch (err) {
      showError(err);
    }
  }

  async function handleResolverAlerta(idAlerta: string) {
    setFeedback(null);
    try {
      await resolveFraudAlert(idAlerta);
      setFeedback({ kind: "success", text: `Alerta ${short(idAlerta)} marcada como resuelta.` });
      await refresh();
    } catch (err) {
      showError(err);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <FlowBanner
        step="Microservicio 6: Fraud Service"
        title="Detecci?n de Fraude, Motor de Reglas y Scoring de Riesgo"
        description="Monitoreo en tiempo real de transferencias y pagos con tarjeta. Consume eventos de RabbitMQ, calcula scores de riesgo y genera alertas cr?ticas para el equipo de cumplimiento."
      />

      {feedback && (
        <Banner
          variant={feedback.kind === "success" ? "success" : "error"}
          message={feedback.text}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* Grid Superior: Reglas y Simulador */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Gesti?n de Reglas */}
        <Card title="Configurar Regla Antifraude" description="Definir umbrales y pol?ticas de mitigaci?n de riesgo">
          <form onSubmit={handleCrearRegla} className="space-y-4">
            <Field label="Nombre de la Regla">
              <input
                type="text"
                value={nombreRegla}
                onChange={(e) => setNombreRegla(e.target.value)}
                placeholder="Ej. Control de Monto Alto en Transferencias"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Tipo de Regla">
                <select
                  value={tipoRegla}
                  onChange={(e) => setTipoRegla(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm bg-white"
                >
                  <option value="monto_maximo">Monto M?ximo</option>
                  <option value="frecuencia_alta">Alta Frecuencia</option>
                  <option value="geolocalizacion">Geolocalizaci?n Inusual</option>
                </select>
              </Field>

              <Field label="Umbral de Disparo ($)">
                <input
                  type="number"
                  step="0.01"
                  value={umbralRegla}
                  onChange={(e) => setUmbralRegla(e.target.value)}
                  placeholder="Ej. 2500.00"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm font-mono"
                  required
                />
              </Field>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 transition flex items-center justify-center gap-2"
            >
              <Sliders size={16} /> Guardar Regla
            </button>
          </form>
        </Card>

        {/* 2. Simulador de Scoring */}
        <Card title="Simulador de Scoring Antifraude" description="Ejecuta una evaluaci?n heur?stica sobre una transacci?n">
          <form onSubmit={handleEvaluarManual} className="space-y-4">
            <Field label="ID Transacci?n (Opcional - Autogenerable)">
              <input
                type="text"
                value={evalTxId}
                onChange={(e) => setEvalTxId(e.target.value)}
                placeholder="Dejar vac?o para generar UUID autom?tico"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm font-mono"
              />
            </Field>

            <Field label="Monto a Evaluar ($)">
              <input
                type="number"
                step="0.01"
                value={evalMonto}
                onChange={(e) => setEvalMonto(e.target.value)}
                placeholder="Ej. 5000.00"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm font-mono"
                required
              />
            </Field>

            <button
              type="submit"
              className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-amber-700 transition flex items-center justify-center gap-2"
            >
              <Activity size={16} /> Evaluar Riesgo y Scoring
            </button>
          </form>
        </Card>
      </div>

      {/* Centro de Alertas Cr?ticas */}
      <Card title="Centro de Alertas de Seguridad & Fraude" description="Alertas generadas autom?ticamente por el motor de reglas y eventos de RabbitMQ">
        {alertas.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No hay alertas activas de fraude. El sistema opera normalmente.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alertas.map((a) => (
              <div
                key={a.id_alerta}
                className={`p-5 rounded-xl border ${
                  a.estado === "abierta"
                    ? a.prioridad === "alta"
                      ? "bg-rose-50 border-rose-200"
                      : "bg-amber-50 border-amber-200"
                    : "bg-slate-50 border-slate-200 opacity-75"
                } shadow-sm space-y-3 transition`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                    <ShieldAlert
                      size={16}
                      className={a.prioridad === "alta" ? "text-rose-600 animate-pulse" : "text-amber-600"}
                    />
                    Alerta #{short(a.id_alerta)}
                  </span>
                  <StatusPill value={a.prioridad} />
                </div>

                <div className="text-xs space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>Evaluaci?n:</span>
                    <span className="font-mono text-slate-900">{short(a.id_evaluacion)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estado:</span>
                    <StatusPill value={a.estado} />
                  </div>
                  <div className="flex justify-between">
                    <span>Fecha:</span>
                    <span>{new Date(a.fecha_generacion).toLocaleTimeString()}</span>
                  </div>
                </div>

                {a.estado === "abierta" && (
                  <button
                    onClick={() => handleResolverAlerta(a.id_alerta)}
                    className="w-full mt-2 py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 shadow-sm transition"
                  >
                    <Check size={14} className="text-emerald-600" /> Marcar Resuelta
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Tabla de Evaluaciones */}
      <Card title="Historial de Evaluaciones de Riesgo" description="Registro inmutable de scoring de transacciones">
        {evaluaciones.length === 0 ? (
          <div className="p-6 text-center text-slate-400">No hay evaluaciones registradas a?n.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/80 text-xs text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">ID Evaluaci?n</th>
                  <th className="p-3">Transacci?n Evaluada</th>
                  <th className="p-3">Regla Aplicada</th>
                  <th className="p-3 text-center">Score de Riesgo</th>
                  <th className="p-3 text-center">Resultado</th>
                  <th className="p-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evaluaciones.map((ev) => (
                  <tr key={ev.id_evaluacion} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-mono text-xs text-indigo-600">{short(ev.id_evaluacion)}</td>
                    <td className="p-3 font-mono text-xs text-slate-700">{short(ev.id_transaccion)}</td>
                    <td className="p-3 font-mono text-xs text-slate-500">{short(ev.id_regla)}</td>
                    <td className="p-3 text-center font-bold">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs ${
                          ev.score_riesgo >= 70
                            ? "bg-rose-100 text-rose-700 font-bold"
                            : ev.score_riesgo >= 40
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {ev.score_riesgo.toFixed(1)} / 100
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <StatusPill value={ev.resultado} />
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {new Date(ev.fecha_evaluacion).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
