"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { Banner } from "@/components/Banner";
import { StatusPill } from "@/components/StatusPill";
import { ApiError, Transferencia, listTransfers } from "@/lib/api";
import { Search, RefreshCw, AlertCircle } from "lucide-react";

type Feedback = { kind: "success" | "error"; text: string } | null;

export default function RastreoPage() {
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [filtradas, setFiltradas] = useState<Transferencia[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [loading, setLoading] = useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  async function refresh() {
    setLoading(true);
    setFeedback(null);
    try {
      const todas = await listTransfers();
      setTransferencias(todas);
      setFiltradas(todas);
    } catch (err) {
      if (err instanceof ApiError) {
        setFeedback({ kind: "error", text: `(${err.status}) ${err.message}` });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    let res = [...transferencias];
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      res = res.filter((t) =>
        t.id_transferencia.toLowerCase().includes(q) ||
        t.id_cuenta_origen.toLowerCase().includes(q) ||
        t.id_beneficiario.toLowerCase().includes(q) ||
        t.monto.toString().includes(q)
      );
    }
    if (filtroEstado !== "todos") res = res.filter((t) => t.estado === filtroEstado);
    if (fechaDesde) res = res.filter((t) => new Date(t.fecha_solicitud) >= new Date(fechaDesde));
    if (fechaHasta) res = res.filter((t) => new Date(t.fecha_solicitud) <= new Date(fechaHasta + "T23:59:59"));
    setFiltradas(res);
  }, [busqueda, filtroEstado, fechaDesde, fechaHasta, transferencias]);

  const totalMonto = filtradas.reduce((acc, t) => acc + Number(t.monto || 0), 0);
  const completadas = filtradas.filter((t) => t.estado === "completada").length;
  const pendientes = filtradas.filter((t) => t.estado === "pendiente").length;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total rastreado</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{filtradas.length}</p>
          <p className="text-xs text-slate-400 mt-1">transacciones encontradas</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Monto total</p>
          <p className="text-3xl font-bold text-indigo-700 mt-1">
            ${totalMonto.toLocaleString("es-CO", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Estado</p>
          <div className="flex gap-4 mt-2">
            <div><p className="text-2xl font-bold text-emerald-600">{completadas}</p><p className="text-xs text-slate-400">completadas</p></div>
            <div><p className="text-2xl font-bold text-amber-500">{pendientes}</p><p className="text-xs text-slate-400">pendientes</p></div>
          </div>
        </div>
      </div>

      {feedback && <Banner kind={feedback.kind} text={feedback.text} />}

      <Card title="Buscar Transacciones" subtitle="Filtra por ID, cuenta, estado o rango de fechas">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">Búsqueda libre</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="ID, cuenta origen, beneficiario, monto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="todos">Todos</option>
              <option value="completada">Completada</option>
              <option value="pendiente">Pendiente</option>
              <option value="fallida">Fallida</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={refresh} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors">
              <RefreshCw size={15} /> Actualizar
            </button>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">Desde</label>
            <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">Hasta</label>
            <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm" />
          </div>
          {(busqueda || filtroEstado !== "todos" || fechaDesde || fechaHasta) && (
            <div className="flex items-end">
              <button
                onClick={() => { setBusqueda(""); setFiltroEstado("todos"); setFechaDesde(""); setFechaHasta(""); }}
                className="w-full border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </Card>

      <Card title={`Transacciones (${filtradas.length} resultado${filtradas.length !== 1 ? "s" : ""})`} subtitle="Auditoría completa de transferencias en el sistema">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm animate-pulse">Cargando transacciones...</div>
        ) : filtradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <AlertCircle size={40} strokeWidth={1} />
            <p className="text-sm">No se encontraron transacciones con los filtros aplicados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b-2 border-slate-100 text-xs uppercase tracking-wider">
                  <th className="py-2 pr-3">ID Transferencia</th>
                  <th className="py-2 pr-3">Cuenta Origen</th>
                  <th className="py-2 pr-3">Beneficiario</th>
                  <th className="py-2 pr-3">Monto</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Fecha y Hora</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((t) => (
                  <tr key={t.id_transferencia} className="border-b border-slate-50 hover:bg-indigo-50/30 transition-colors">
                    <td className="py-2.5 pr-3">
                      <span className="font-mono text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded" title={t.id_transferencia}>
                        {t.id_transferencia.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-slate-500" title={t.id_cuenta_origen}>
                      {t.id_cuenta_origen.slice(0, 8)}...
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-slate-500" title={t.id_beneficiario}>
                      {t.id_beneficiario.slice(0, 8)}...
                    </td>
                    <td className="py-2.5 pr-3 font-bold text-slate-800">
                      ${Number(t.monto).toLocaleString("es-CO", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 pr-3"><StatusPill value={t.estado} /></td>
                    <td className="py-2.5 pr-3 text-xs text-slate-500">
                      {new Date(t.fecha_solicitud).toLocaleString("es-CO", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
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
