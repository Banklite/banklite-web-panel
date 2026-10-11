"use client";
import { useEffect, useMemo, useState } from "react";
import { obtenerSesion } from "@/lib/auth";
import { listAccounts, getLedgerBalance, listTransfers, listBeneficiaries, Cuenta, CuentaContable, Transferencia, Beneficiario } from "@/lib/api";
import { FileText, TrendingUp, Wallet, AlertCircle, ArrowUpRight, ArrowDownLeft, X, Download, Calendar, Filter } from "lucide-react";

type Mov = Transferencia & { esIngreso: boolean; benefInfo?: Beneficiario };

function formatNumber(n: number | string) {
  return Number(n).toLocaleString("es-CO");
}

function esc(s: unknown) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function generarComprobantePDF(mov: any, nombreUsuario: string) {
  const html = `
    <html>
    <head><title>Comprobante BankLite</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; }
      .header { text-align: center; border-bottom: 3px solid #0d9f7e; padding-bottom: 20px; margin-bottom: 20px; }
      .header h1 { color: #0a5f4e; margin: 0; }
      .detail { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
      .label { color: #666; }
      .value { font-weight: bold; }
      .amount { font-size: 24px; color: #0d9f7e; text-align: center; margin: 20px 0; }
      .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
      @media print { body { margin: 0; } }
    </style>
    </head>
    <body>
      <div class="header">
        <h1>BankLite</h1>
        <p>Comprobante de Transacción</p>
      </div>
      <div class="amount">$${formatNumber(mov.monto)}</div>
      <div class="detail"><span class="label">Cliente</span><span class="value">${esc(nombreUsuario)}</span></div>
      <div class="detail"><span class="label">Tipo</span><span class="value">${esc(mov.tipo)}</span></div>
      <div class="detail"><span class="label">Descripción</span><span class="value">${esc(mov.descripcion || "-")}</span></div>
      <div class="detail"><span class="label">Fecha</span><span class="value">${new Date(mov.fecha).toLocaleString("es-CO")}</span></div>
      <div class="detail"><span class="label">Referencia</span><span class="value">${esc(mov.id_entrada || mov.id)}</span></div>
      <div class="footer">
        <p>Documento generado por BankLite - ${new Date().toLocaleString("es-CO")}</p>
        <p>Este comprobante es válido como soporte de la transacción</p>
      </div>
    </body>
    </html>
  `;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); w.print(); }
}

function generarExtractoPDF(movs: any[], nombreUsuario: string, desde: string, hasta: string) {
  const filas = movs.map((m) => `
    <tr>
      <td>${new Date(m.fecha).toLocaleDateString("es-CO")}</td>
      <td>${esc(m.tipo)}</td>
      <td>${esc(m.descripcion || "-")}</td>
      <td>${esc(m.estado)}</td>
      <td style="text-align:right">${m.signo}$${formatNumber(m.monto)}</td>
    </tr>`).join("");
  const rango = desde || hasta ? `${desde || "inicio"} a ${hasta || "hoy"}` : "Todos los movimientos";
  const html = `
    <html>
    <head><title>Extracto BankLite</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
      .header { text-align: center; border-bottom: 3px solid #0d9f7e; padding-bottom: 20px; margin-bottom: 20px; }
      .header h1 { color: #0a5f4e; margin: 0; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { background: #ecfdf7; color: #0a5f4e; text-align: left; }
      th, td { padding: 8px; border-bottom: 1px solid #eee; }
      .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
      @media print { body { margin: 0; } }
    </style>
    </head>
    <body>
      <div class="header">
        <h1>BankLite</h1>
        <p>Extracto de Movimientos</p>
        <p>Cliente: ${esc(nombreUsuario)} &middot; Periodo: ${esc(rango)}</p>
      </div>
      <table>
        <thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Estado</th><th style="text-align:right">Monto</th></tr></thead>
        <tbody>${filas || '<tr><td colspan="5">Sin movimientos</td></tr>'}</tbody>
      </table>
      <div class="footer">
        <p>Documento generado por BankLite - ${new Date().toLocaleString("es-CO")}</p>
      </div>
    </body>
    </html>
  `;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); w.print(); }
}

function toPdfMov(t: Mov) {
  return {
    id: t.id_transferencia,
    id_entrada: t.referencia || t.id_transferencia,
    monto: t.monto,
    tipo: t.esIngreso ? "Transferencia recibida" : "Transferencia enviada",
    descripcion: [t.esIngreso ? "" : t.benefInfo?.nombre ? `A: ${t.benefInfo.nombre}` : "", t.concepto].filter(Boolean).join(" - "),
    fecha: t.fecha_solicitud,
    estado: t.estado,
    signo: t.esIngreso ? "+" : "-",
  };
}

function toISODateLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function ClienteMovimientosPage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [saldos, setSaldos] = useState<Record<string, CuentaContable | null>>({});
  const [transferencias, setTransferencias] = useState<Mov[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nombreUsuario, setNombreUsuario] = useState("Cliente");

  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // Modal de Comprobante
  const [selectedTx, setSelectedTx] = useState<Mov | null>(null);

  useEffect(() => {
    const sesion = obtenerSesion();
    if (sesion?.usuario) {
      const u: any = sesion.usuario;
      setNombreUsuario(u.nombre || u.nombre_completo || u.email || "Cliente");
    }
    async function cargar() {
      try {
        const todasCuentas = await listAccounts();
        const misCuentas = todasCuentas.filter(c => c.id_usuario === sesion?.usuario.id_usuario);
        setCuentas(misCuentas);

        const saldosMap: Record<string, CuentaContable | null> = {};
        await Promise.all(misCuentas.map(async (c) => {
          try {
            saldosMap[c.id_cuenta] = await getLedgerBalance(c.id_cuenta);
          } catch {
            saldosMap[c.id_cuenta] = null;
          }
        }));
        setSaldos(saldosMap);

        const [todasTrans, todosBenef] = await Promise.all([listTransfers(), listBeneficiaries()]);
        const miIdsCuentas = misCuentas.map(c => c.id_cuenta);

        const misMovs = todasTrans.map(t => {
          const benef = todosBenef.find(b => b.id_beneficiario === t.id_beneficiario);
          const soyOrigen = miIdsCuentas.includes(t.id_cuenta_origen);
          const soyDestino = benef && miIdsCuentas.includes(benef.cuenta_destino);

          if (soyOrigen) return { ...t, esIngreso: false, benefInfo: benef };
          if (soyDestino) return { ...t, esIngreso: true, benefInfo: benef };
          return null;
        }).filter(Boolean) as Mov[];

        misMovs.sort((a, b) => new Date(b.fecha_solicitud).getTime() - new Date(a.fecha_solicitud).getTime());
        setTransferencias(misMovs);
      } catch {
        setError("No pudimos cargar sus movimientos. Intente nuevamente.");
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  const filtradas = useMemo(() => {
    return transferencias.filter((t) => {
      const f = toISODateLocal(new Date(t.fecha_solicitud));
      if (desde && f < desde) return false;
      if (hasta && f > hasta) return false;
      return true;
    });
  }, [transferencias, desde, hasta]);

  if (loading) return <div className="text-center py-16 text-2xl text-slate-400 animate-pulse">Consultando sus cuentas...</div>;
  if (error) return (
    <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 flex items-center gap-4">
      <AlertCircle size={32} className="text-red-500 flex-shrink-0" />
      <p className="text-red-800 text-lg">{error}</p>
    </div>
  );

  if (cuentas.length === 0) return (
    <div className="text-center py-16">
      <Wallet size={64} className="mx-auto text-slate-300 mb-4" />
      <h2 className="text-2xl font-bold text-slate-600">Aun no tiene cuentas</h2>
      <p className="text-slate-500 mt-2 text-lg">Comuniquese con un asesor para abrir su cuenta.</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-800">Mis Movimientos</h1>
        <p className="text-lg text-slate-500">Consulte el saldo y movimientos de sus cuentas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cuentas.map(c => {
          const s = saldos[c.id_cuenta];
          return (
            <div key={c.id_cuenta} className="bg-gradient-to-br from-brand-500 to-brand-700 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-20">
                <Wallet size={80} />
              </div>
              <div className="relative z-10">
                <p className="text-brand-100 font-semibold mb-1 capitalize">Cuenta {c.tipo_cuenta} — {c.moneda}</p>
                <p className="text-sm font-mono text-brand-100 mb-4">{c.numero_cuenta ?? "Sin número asignado"}</p>
                <p className="text-brand-50 text-sm mb-1">Saldo Disponible</p>
                {s ? (
                  <p className="text-4xl font-black">${Number(s.saldo_actual).toLocaleString()}</p>
                ) : (
                  <p className="text-2xl font-bold text-brand-100">Saldo no disponible</p>
                )}
                <div className="mt-6 flex items-center gap-2 text-brand-100 bg-black/10 w-max px-3 py-1.5 rounded-lg">
                  <TrendingUp size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">{c.estado}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FileText size={24} className="text-brand-600" />
            <h2 className="text-xl font-bold text-slate-800">Últimas Transferencias</h2>
          </div>
          <button
            onClick={() => generarExtractoPDF(filtradas.map(toPdfMov), nombreUsuario, desde, hasta)}
            disabled={filtradas.length === 0}
            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors"
          >
            <Download size={18} /> Descargar extracto
          </button>
        </div>

        {/* Filtros de fecha */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 text-brand-700 font-bold">
            <Filter size={18} /> Filtrar
          </div>
          <label className="text-sm font-semibold text-slate-600">
            <span className="flex items-center gap-1 mb-1"><Calendar size={14} className="text-brand-600" /> Desde</span>
            <input
              type="date"
              value={desde}
              max={hasta || undefined}
              onChange={(e) => setDesde(e.target.value)}
              className="border-2 border-slate-300 rounded-xl px-3 py-2 focus:border-brand-500 focus:outline-none"
            />
          </label>
          <label className="text-sm font-semibold text-slate-600">
            <span className="flex items-center gap-1 mb-1"><Calendar size={14} className="text-brand-600" /> Hasta</span>
            <input
              type="date"
              value={hasta}
              min={desde || undefined}
              onChange={(e) => setHasta(e.target.value)}
              className="border-2 border-slate-300 rounded-xl px-3 py-2 focus:border-brand-500 focus:outline-none"
            />
          </label>
          {(desde || hasta) && (
            <button
              onClick={() => { setDesde(""); setHasta(""); }}
              className="text-brand-600 font-bold hover:underline pb-2"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {filtradas.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 text-lg">
              {transferencias.length === 0
                ? "No has realizado ninguna transferencia todavia."
                : "No hay movimientos en el rango de fechas seleccionado."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtradas.map(t => {
              const benef = t.benefInfo;
              const isError = t.estado === "error" || t.estado === "fallida" || t.estado === "rechazada";
              return (
                <div
                  key={t.id_transferencia}
                  onClick={() => setSelectedTx(t)}
                  className="p-6 flex items-center justify-between gap-4 hover:bg-brand-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${isError ? 'bg-red-100 text-red-600' : t.esIngreso ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-600'}`}>
                      {t.esIngreso ? <ArrowDownLeft size={24} strokeWidth={2.5} /> : <ArrowUpRight size={24} strokeWidth={2.5} />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-lg">
                        {t.esIngreso ? `De: Cuenta ${short(t.id_cuenta_origen)}` : `A: ${benef ? benef.nombre : "Desconocido"}`}
                      </p>
                      <p className="text-sm text-slate-500">
                        Ref: {t.referencia || short(t.id_transferencia)} • {new Date(t.fecha_solicitud).toLocaleDateString()}
                      </p>
                      {t.concepto && (
                        <p className="text-sm font-medium text-slate-600 mt-1">"{t.concepto}"</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-xl font-black ${isError ? 'text-slate-400 line-through' : t.esIngreso ? 'text-brand-600' : 'text-slate-800'}`}>
                        {t.esIngreso ? '+' : '-'}${Number(t.monto).toLocaleString()}
                      </p>
                      <p className={`text-xs font-bold uppercase tracking-wider mt-1 ${isError ? 'text-red-500' : 'text-brand-600'}`}>
                        {t.estado}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); generarComprobantePDF(toPdfMov(t), nombreUsuario); }}
                      title="Descargar comprobante"
                      className="flex items-center gap-1.5 text-sm font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-100 px-3 py-2 rounded-xl transition-colors"
                    >
                      <FileText size={16} />
                      <span className="hidden sm:inline">Descargar comprobante</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL COMPROBANTE */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-6 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <FileText className="text-brand-600" /> Comprobante
              </h3>
              <button onClick={() => setSelectedTx(null)} className="text-slate-400 hover:text-slate-600 bg-slate-200/50 hover:bg-slate-200 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="text-center">
                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">Valor de la transacción</p>
                <p className={`text-4xl font-black ${selectedTx.esIngreso ? 'text-brand-600' : 'text-slate-800'}`}>
                  ${Number(selectedTx.monto).toLocaleString()} COP
                </p>
              </div>

              <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-100 text-sm">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Fecha y hora</span>
                  <span className="font-bold text-slate-800">{new Date(selectedTx.fecha_solicitud).toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Referencia</span>
                  <span className="font-mono text-slate-800">{selectedTx.referencia || selectedTx.id_transferencia}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Tipo</span>
                  <span className="font-bold text-slate-800">{selectedTx.esIngreso ? 'Transferencia Recibida' : 'Transferencia Enviada'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Estado</span>
                  <span className={`font-bold uppercase ${selectedTx.estado === 'completada' ? 'text-brand-600' : 'text-red-500'}`}>{selectedTx.estado}</span>
                </div>
                {!selectedTx.esIngreso && selectedTx.benefInfo && (
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Destinatario</span>
                    <span className="font-bold text-slate-800 text-right">{selectedTx.benefInfo.nombre}</span>
                  </div>
                )}
                {selectedTx.concepto && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Concepto</span>
                    <span className="font-bold text-slate-800 text-right">{selectedTx.concepto}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => generarComprobantePDF(toPdfMov(selectedTx), nombreUsuario)}
                className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-colors"
              >
                <Download size={18} /> Descargar comprobante
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function short(id: string) {
  return id.split("-")[0];
}
