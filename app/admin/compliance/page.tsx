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
  ReporteRegulatorio,
  TransaccionSospechosa,
  AuditoriaCompliance,
  listReportesRegulatorios,
  createReporteRegulatorio,
  updateReporteEstado,
  listTransaccionesSospechosas,
  flagTransaccionSospechosa,
  updateSospechaEstado,
  listAuditoriasCompliance,
  createAuditoriaCompliance,
} from "@/lib/api";
import { FileText, AlertTriangle, ClipboardCheck, Check, Plus, Search } from "lucide-react";

type Feedback = { kind: "success" | "error"; text: string } | null;

export default function CompliancePage() {
  const [reportes, setReportes] = useState<ReporteRegulatorio[]>([]);
  const [sospechosas, setSospechosas] = useState<TransaccionSospechosa[]>([]);
  const [auditorias, setAuditorias] = useState<AuditoriaCompliance[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [sospPage, setSospPage] = useState(0);
  const [repPage, setRepPage] = useState(0);
  const PAGE_SIZE = 10;

  const sospPagina = sospechosas.slice(sospPage * PAGE_SIZE, (sospPage + 1) * PAGE_SIZE);
  const repPagina = reportes.slice(repPage * PAGE_SIZE, (repPage + 1) * PAGE_SIZE);

  // Formulario Reporte
  const [tipoReporte, setTipoReporte] = useState("SAR");
  const [periodo, setPeriodo] = useState("");
  const [contenido, setContenido] = useState("");
  const [generadoPor, setGeneradoPor] = useState("");

  // Formulario Sospechosa
  const [fIdTransferencia, setFIdTransferencia] = useState("");
  const [fIdCuenta, setFIdCuenta] = useState("");
  const [fIdUsuario, setFIdUsuario] = useState("");
  const [fMotivo, setFMotivo] = useState("");
  const [fNivel, setFNivel] = useState("medio");
  const [fMonto, setFMonto] = useState("");

  // Formulario Auditoria
  const [audIdSospecha, setAudIdSospecha] = useState("");
  const [audAuditor, setAudAuditor] = useState("");
  const [audResultado, setAudResultado] = useState("aprobada");
  const [audNotas, setAudNotas] = useState("");

  async function refresh() {
    try {
      const [r, s, a] = await Promise.all([
        listReportesRegulatorios().catch(() => []),
        listTransaccionesSospechosas().catch(() => []),
        listAuditoriasCompliance().catch(() => []),
      ]);
      setReportes(r);
      setSospechosas(s);
      setAuditorias(a);
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
        text: `Error de conexion con compliance-service: ${err.message}. Esta corriendo en el puerto 8008?`,
      });
    } else {
      setFeedback({ kind: "error", text: "Ocurrio un error inesperado." });
    }
  }

  async function handleCrearReporte(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!periodo.trim()) {
      setFeedback({ kind: "error", text: "El periodo es obligatorio." });
      return;
    }
    try {
      const res = await createReporteRegulatorio({
        tipo_reporte: tipoReporte,
        periodo: periodo.trim(),
        contenido: contenido.trim() || undefined,
        generado_por: generadoPor.trim() || undefined,
      });
      setFeedback({ kind: "success", text: `Reporte "${res.tipo_reporte}" creado para el periodo ${res.periodo}.` });
      setPeriodo("");
      setContenido("");
      setGeneradoPor("");
      await refresh();
    } catch (err) {
      showError(err);
    }
  }

  async function handleFlagSospechosa(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!fIdTransferencia.trim() || !fIdCuenta.trim() || !fIdUsuario.trim() || !fMotivo.trim()) {
      setFeedback({ kind: "error", text: "Todos los campos obligatorios deben completarse." });
      return;
    }
    try {
      const res = await flagTransaccionSospechosa({
        id_transferencia: fIdTransferencia.trim(),
        id_cuenta_origen: fIdCuenta.trim(),
        id_usuario: fIdUsuario.trim(),
        motivo: fMotivo.trim(),
        nivel_riesgo: fNivel,
        monto: fMonto ? parseFloat(fMonto) : undefined,
      });
      setFeedback({ kind: "success", text: `Transaccion ${short(res.id_sospecha)} marcada como sospechosa (${res.nivel_riesgo}).` });
      setFIdTransferencia("");
      setFIdCuenta("");
      setFIdUsuario("");
      setFMotivo("");
      setFMonto("");
      await refresh();
    } catch (err) {
      showError(err);
    }
  }

  async function handleCambiarEstadoSospecha(id: string, estado: string) {
    setFeedback(null);
    try {
      await updateSospechaEstado(id, estado);
      setFeedback({ kind: "success", text: `Sospecha ${short(id)} actualizada a "${estado}".` });
      await refresh();
    } catch (err) {
      showError(err);
    }
  }

  async function handleCambiarEstadoReporte(id: string, estado: string) {
    setFeedback(null);
    try {
      await updateReporteEstado(id, estado);
      setFeedback({ kind: "success", text: `Reporte ${short(id)} actualizado a "${estado}".` });
      await refresh();
    } catch (err) {
      showError(err);
    }
  }

  async function handleCrearAuditoria(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!audIdSospecha.trim()) {
      setFeedback({ kind: "error", text: "El ID de sospecha es obligatorio." });
      return;
    }
    try {
      const res = await createAuditoriaCompliance({
        id_sospecha: audIdSospecha.trim(),
        auditor: audAuditor.trim() || undefined,
        resultado: audResultado,
        notas: audNotas.trim() || undefined,
      });
      setFeedback({ kind: "success", text: `Auditoria ${short(res.id_auditoria)} registrada con resultado "${res.resultado}".` });
      setAudIdSospecha("");
      setAudAuditor("");
      setAudNotas("");
      await refresh();
    } catch (err) {
      showError(err);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <FlowBanner
        steps={[
          "1. Marcar transacciones sospechosas para revision regulatoria.",
          "2. Generar reportes regulatorios (SAR, CTR) por periodo.",
          "3. Auditar casos sospechosos y registrar resultados de compliance.",
        ]}
      />

      {feedback && <Banner kind={feedback.kind} text={feedback.text} />}

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-brand-50 text-brand-600"><FileText size={18} /></div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reportes</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{reportes.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600"><AlertTriangle size={18} /></div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sospechosas</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{sospechosas.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600"><Search size={18} /></div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pendientes</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{sospechosas.filter(s => s.estado === "pendiente").length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><ClipboardCheck size={18} /></div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Auditorias</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{auditorias.length}</p>
        </div>
      </div>

      {/* Formularios */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Crear Reporte */}
        <Card title="Generar Reporte Regulatorio" subtitle="SAR, CTR u otros reportes de cumplimiento">
          <form onSubmit={handleCrearReporte} className="space-y-4">
            <Field label="Tipo de Reporte">
              <select
                value={tipoReporte}
                onChange={(e) => setTipoReporte(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm bg-white"
              >
                <option value="SAR">SAR - Reporte de Actividad Sospechosa</option>
                <option value="CTR">CTR - Reporte de Transacciones en Efectivo</option>
                <option value="ROS">ROS - Reporte de Operacion Sospechosa</option>
                <option value="PEP">PEP - Personas Expuestas Politicamente</option>
              </select>
            </Field>
            <Field label="Periodo">
              <input
                type="text"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                placeholder="Ej. 2026-Q3, 2026-10"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
                required
              />
            </Field>
            <Field label="Contenido / Notas (Opcional)">
              <textarea
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                placeholder="Descripcion o contenido del reporte"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
                rows={2}
              />
            </Field>
            <Field label="Generado por (Opcional)">
              <input
                type="text"
                value={generadoPor}
                onChange={(e) => setGeneradoPor(e.target.value)}
                placeholder="Nombre del oficial de cumplimiento"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
              />
            </Field>
            <button
              type="submit"
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-brand-700 transition flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Generar Reporte
            </button>
          </form>
        </Card>

        {/* Flag Sospechosa */}
        <Card title="Marcar Transaccion Sospechosa" subtitle="Reportar una transferencia para revision">
          <form onSubmit={handleFlagSospechosa} className="space-y-4">
            <Field label="ID Transferencia">
              <input
                type="text"
                value={fIdTransferencia}
                onChange={(e) => setFIdTransferencia(e.target.value)}
                placeholder="UUID de la transferencia"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm font-mono"
                required
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ID Cuenta Origen">
                <input
                  type="text"
                  value={fIdCuenta}
                  onChange={(e) => setFIdCuenta(e.target.value)}
                  placeholder="UUID cuenta"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm font-mono"
                  required
                />
              </Field>
              <Field label="ID Usuario">
                <input
                  type="text"
                  value={fIdUsuario}
                  onChange={(e) => setFIdUsuario(e.target.value)}
                  placeholder="UUID usuario"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm font-mono"
                  required
                />
              </Field>
            </div>
            <Field label="Motivo">
              <input
                type="text"
                value={fMotivo}
                onChange={(e) => setFMotivo(e.target.value)}
                placeholder="Ej. Monto inusual, patron sospechoso"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
                required
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nivel de Riesgo">
                <select
                  value={fNivel}
                  onChange={(e) => setFNivel(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm bg-white"
                >
                  <option value="bajo">Bajo</option>
                  <option value="medio">Medio</option>
                  <option value="alto">Alto</option>
                  <option value="critico">Critico</option>
                </select>
              </Field>
              <Field label="Monto ($) Opcional">
                <input
                  type="number"
                  step="0.01"
                  value={fMonto}
                  onChange={(e) => setFMonto(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm font-mono"
                />
              </Field>
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-amber-700 transition flex items-center justify-center gap-2"
            >
              <AlertTriangle size={16} /> Reportar Sospechosa
            </button>
          </form>
        </Card>

        {/* Crear Auditoria */}
        <Card title="Registrar Auditoria" subtitle="Documentar resultado de revision de compliance">
          <form onSubmit={handleCrearAuditoria} className="space-y-4">
            <Field label="ID Sospecha a Auditar">
              <input
                type="text"
                value={audIdSospecha}
                onChange={(e) => setAudIdSospecha(e.target.value)}
                placeholder="UUID de la sospecha"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm font-mono"
                required
              />
            </Field>
            <Field label="Auditor (Opcional)">
              <input
                type="text"
                value={audAuditor}
                onChange={(e) => setAudAuditor(e.target.value)}
                placeholder="Nombre del auditor"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
              />
            </Field>
            <Field label="Resultado">
              <select
                value={audResultado}
                onChange={(e) => setAudResultado(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm bg-white"
              >
                <option value="aprobada">Aprobada - Sin hallazgos</option>
                <option value="observacion">Observacion - Requiere seguimiento</option>
                <option value="rechazada">Rechazada - Actividad confirmada</option>
                <option value="escalada">Escalada - Derivar a autoridad</option>
              </select>
            </Field>
            <Field label="Notas (Opcional)">
              <textarea
                value={audNotas}
                onChange={(e) => setAudNotas(e.target.value)}
                placeholder="Observaciones de la auditoria"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
                rows={2}
              />
            </Field>
            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 transition flex items-center justify-center gap-2"
            >
              <ClipboardCheck size={16} /> Registrar Auditoria
            </button>
          </form>
        </Card>
      </div>

      {/* Tabla Sospechosas */}
      <Card title="Transacciones Sospechosas" subtitle="Transacciones marcadas para revision de cumplimiento">
        {sospechosas.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No hay transacciones sospechosas registradas.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/80 text-xs text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Transferencia</th>
                  <th className="p-3">Motivo</th>
                  <th className="p-3 text-center">Nivel</th>
                  <th className="p-3 text-right">Monto</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sospPagina.map((s) => (
                  <tr key={s.id_sospecha} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-mono text-xs text-brand-600">{short(s.id_sospecha)}</td>
                    <td className="p-3 font-mono text-xs text-slate-700">{short(s.id_transferencia)}</td>
                    <td className="p-3 text-sm text-slate-800 max-w-[200px] truncate">{s.motivo}</td>
                    <td className="p-3 text-center">
                      <StatusPill value={s.nivel_riesgo} />
                    </td>
                    <td className="p-3 text-right font-mono text-sm">
                      {s.monto != null ? `$${Number(s.monto).toLocaleString("es-CO")}` : "-"}
                    </td>
                    <td className="p-3 text-center">
                      <StatusPill value={s.estado} />
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {new Date(s.fecha_deteccion).toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      {s.estado === "pendiente" && (
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => handleCambiarEstadoSospecha(s.id_sospecha, "en_revision")}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded text-xs font-medium text-amber-700 transition"
                          >
                            Revisar
                          </button>
                          <button
                            onClick={() => handleCambiarEstadoSospecha(s.id_sospecha, "descartada")}
                            className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-xs font-medium text-slate-600 transition"
                          >
                            Descartar
                          </button>
                        </div>
                      )}
                      {s.estado === "en_revision" && (
                        <button
                          onClick={() => handleCambiarEstadoSospecha(s.id_sospecha, "resuelta")}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded text-xs font-medium text-emerald-700 transition flex items-center gap-1 mx-auto"
                        >
                          <Check size={12} /> Resolver
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {sospechosas.length > 0 && (
          <div className="flex items-center justify-between mt-4 px-2">
            <p className="text-sm text-slate-500">
              Mostrando {sospPage * PAGE_SIZE + 1} - {Math.min((sospPage + 1) * PAGE_SIZE, sospechosas.length)} de {sospechosas.length}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setSospPage(p => Math.max(0, p - 1))} disabled={sospPage === 0}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Anterior
              </button>
              <span className="px-4 py-2 text-sm font-medium text-slate-600">Pagina {sospPage + 1}</span>
              <button onClick={() => setSospPage(p => p + 1)} disabled={(sospPage + 1) * PAGE_SIZE >= sospechosas.length}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Siguiente
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Tabla Reportes */}
      <Card title="Reportes Regulatorios" subtitle="Historial de reportes de cumplimiento generados">
        {reportes.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No hay reportes regulatorios generados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/80 text-xs text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Periodo</th>
                  <th className="p-3">Generado por</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {repPagina.map((r) => (
                  <tr key={r.id_reporte} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-mono text-xs text-brand-600">{short(r.id_reporte)}</td>
                    <td className="p-3 text-sm font-semibold text-slate-800">{r.tipo_reporte}</td>
                    <td className="p-3 text-sm text-slate-700">{r.periodo}</td>
                    <td className="p-3 text-sm text-slate-600">{r.generado_por || "-"}</td>
                    <td className="p-3 text-center">
                      <StatusPill value={r.estado} />
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {new Date(r.fecha_generacion).toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      {r.estado === "borrador" && (
                        <button
                          onClick={() => handleCambiarEstadoReporte(r.id_reporte, "enviado")}
                          className="px-2 py-1 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded text-xs font-medium text-brand-700 transition"
                        >
                          Enviar
                        </button>
                      )}
                      {r.estado === "enviado" && (
                        <button
                          onClick={() => handleCambiarEstadoReporte(r.id_reporte, "aprobado")}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded text-xs font-medium text-emerald-700 transition flex items-center gap-1 mx-auto"
                        >
                          <Check size={12} /> Aprobar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {reportes.length > 0 && (
          <div className="flex items-center justify-between mt-4 px-2">
            <p className="text-sm text-slate-500">
              Mostrando {repPage * PAGE_SIZE + 1} - {Math.min((repPage + 1) * PAGE_SIZE, reportes.length)} de {reportes.length}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setRepPage(p => Math.max(0, p - 1))} disabled={repPage === 0}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Anterior
              </button>
              <span className="px-4 py-2 text-sm font-medium text-slate-600">Pagina {repPage + 1}</span>
              <button onClick={() => setRepPage(p => p + 1)} disabled={(repPage + 1) * PAGE_SIZE >= reportes.length}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Siguiente
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Tabla Auditorias */}
      <Card title="Registro de Auditorias" subtitle="Historial de revisiones de compliance realizadas">
        {auditorias.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No hay auditorias registradas.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/80 text-xs text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">ID Auditoria</th>
                  <th className="p-3">ID Sospecha</th>
                  <th className="p-3">Auditor</th>
                  <th className="p-3 text-center">Resultado</th>
                  <th className="p-3">Notas</th>
                  <th className="p-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditorias.map((a) => (
                  <tr key={a.id_auditoria} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-mono text-xs text-brand-600">{short(a.id_auditoria)}</td>
                    <td className="p-3 font-mono text-xs text-slate-700">{short(a.id_sospecha)}</td>
                    <td className="p-3 text-sm text-slate-700">{a.auditor || "-"}</td>
                    <td className="p-3 text-center">
                      <StatusPill value={a.resultado} />
                    </td>
                    <td className="p-3 text-sm text-slate-600 max-w-[200px] truncate">{a.notas || "-"}</td>
                    <td className="p-3 text-xs text-slate-500">
                      {new Date(a.fecha_auditoria).toLocaleString()}
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
