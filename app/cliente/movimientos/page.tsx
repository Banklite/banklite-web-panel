"use client";
import { useEffect, useMemo, useState } from "react";
import { obtenerSesion } from "@/lib/auth";
import { listAccounts, getLedgerBalance, listTransfers, listBeneficiaries, Cuenta, CuentaContable, Transferencia, Beneficiario } from "@/lib/api";
import { FileText, TrendingUp, Wallet, AlertCircle, ArrowUpRight, ArrowDownLeft, X, Download, Calendar, Filter, Loader2, Share2, CheckCircle, ShieldCheck, QrCode, Copy, Check } from "lucide-react";

type Mov = Transferencia & { esIngreso: boolean; benefInfo?: Beneficiario };

function formatNumber(n: number | string) { return Number(n).toLocaleString("es-CO"); }

function esc(s: unknown) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function generarComprobantePDF(mov: any, nombreUsuario: string) {
  const html = `<html><head><title>Comprobante BankLite</title><style>
    body{font-family:Arial,sans-serif;max-width:600px;margin:40px auto;padding:20px;}
    .header{text-align:center;border-bottom:3px solid #0d9f7e;padding-bottom:20px;margin-bottom:20px;}
    .header h1{color:#0a5f4e;margin:0;}
    .detail{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;}
    .label{color:#666;}.value{font-weight:bold;}
    .amount{font-size:24px;color:#0d9f7e;text-align:center;margin:20px 0;}
    .footer{text-align:center;margin-top:30px;color:#999;font-size:12px;}
    @media print{body{margin:0;}}
  </style></head><body>
    <div class="header"><h1>BankLite</h1><p>Comprobante de Transacción</p></div>
    <div class="amount">$${formatNumber(mov.monto)}</div>
    <div class="detail"><span class="label">Cliente</span><span class="value">${esc(nombreUsuario)}</span></div>
    <div class="detail"><span class="label">Tipo</span><span class="value">${esc(mov.tipo)}</span></div>
    <div class="detail"><span class="label">Descripción</span><span class="value">${esc(mov.descripcion || "-")}</span></div>
    <div class="detail"><span class="label">Fecha</span><span class="value">${new Date(mov.fecha).toLocaleString("es-CO")}</span></div>
    <div class="detail"><span class="label">Referencia</span><span class="value">${esc(mov.id_entrada || mov.id)}</span></div>
    <div class="footer"><p>Generado por BankLite - ${new Date().toLocaleString("es-CO")}</p></div>
  </body></html>`;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); w.print(); }
}

function generarExtractoPDF(movs: any[], nombreUsuario: string, desde: string, hasta: string, numeroCuenta?: string) {
  const filas = movs.map((m, i) => `
    <tr style="${i % 2 === 1 ? "background:#f8fafc;" : ""}">
      <td>${new Date(m.fecha).toLocaleDateString("es-CO")}</td>
      <td>${esc(m.tipo)}</td>
      <td>${esc(m.descripcion || "-")}</td>
      <td><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase;${m.estado === "completada" ? "background:#ecfdf5;color:#059669;" : "background:#fef2f2;color:#dc2626;"}">${esc(m.estado)}</span></td>
      <td style="text-align:right;font-weight:600;${m.signo === "+" ? "color:#059669;" : "color:#1e293b;"}">${m.signo}$${formatNumber(m.monto)}</td>
    </tr>`).join("");
  const totalEnviado = movs.filter(m => m.signo === "-").reduce((s, m) => s + Number(m.monto), 0);
  const totalRecibido = movs.filter(m => m.signo === "+").reduce((s, m) => s + Number(m.monto), 0);
  const rangoDesde = desde || "inicio";
  const rangoHasta = hasta || new Date().toLocaleDateString("es-CO");
  const fechaGeneracion = new Date().toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" });
  const html = `<html><head><title>Extracto BankLite</title><style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Segoe UI',sans-serif;margin:40px;color:#1e293b;line-height:1.5;}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0d9f7e;padding-bottom:16px;margin-bottom:24px;}
    .logo{font-size:28px;font-weight:900;color:#0d9f7e;}
    .logo-sub{font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:2px;margin-top:2px;}
    .doc-title{font-size:18px;font-weight:800;color:#1e293b;text-align:right;}
    .doc-meta{font-size:13px;color:#64748b;margin-top:4px;text-align:right;}
    .info-row{display:flex;gap:24px;margin-bottom:24px;flex-wrap:wrap;}
    .info-label{font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:1px;}
    .info-value{font-size:14px;font-weight:700;color:#1e293b;margin-top:2px;}
    .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:28px;}
    .summary-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;}
    .summary-card .label{font-size:11px;color:#64748b;text-transform:uppercase;font-weight:700;}
    .summary-card .value{font-size:22px;font-weight:800;color:#0f172a;margin-top:4px;}
    .summary-card.green .value{color:#059669;}.summary-card.red .value{color:#dc2626;}
    table{width:100%;border-collapse:collapse;font-size:13px;}
    th{background:#0d9f7e;color:white;padding:10px 12px;text-align:left;font-weight:700;font-size:12px;text-transform:uppercase;}
    th:last-child{text-align:right;}
    td{padding:10px 12px;border-bottom:1px solid #e2e8f0;}
    .footer{margin-top:36px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;}
    .footer p{font-size:11px;color:#94a3b8;margin-bottom:4px;}
    .footer .brand{font-weight:700;color:#0d9f7e;}
    @media print{body{margin:20px;}}
  </style></head><body>
    <div class="header">
      <div><div class="logo">BankLite</div><div class="logo-sub">Banca Digital Segura</div></div>
      <div><div class="doc-title">Extracto de Movimientos</div><div class="doc-meta">Generado el ${esc(fechaGeneracion)}</div></div>
    </div>
    <div class="info-row">
      <div><div class="info-label">Cliente</div><div class="info-value">${esc(nombreUsuario)}</div></div>
      ${numeroCuenta ? `<div><div class="info-label">Número de Cuenta</div><div class="info-value">${esc(numeroCuenta)}</div></div>` : ""}
      <div><div class="info-label">Desde</div><div class="info-value">${esc(rangoDesde)}</div></div>
      <div><div class="info-label">Hasta</div><div class="info-value">${esc(rangoHasta)}</div></div>
    </div>
    <div class="summary">
      <div class="summary-card"><div class="label">Total Movimientos</div><div class="value">${movs.length}</div></div>
      <div class="summary-card green"><div class="label">Total Recibido</div><div class="value">+$${formatNumber(totalRecibido)}</div></div>
      <div class="summary-card red"><div class="label">Total Enviado</div><div class="value">-$${formatNumber(totalEnviado)}</div></div>
    </div>
    <table><thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Estado</th><th style="text-align:right">Monto</th></tr></thead>
    <tbody>${filas || '<tr><td colspan="5" style="text-align:center;padding:24px;color:#94a3b8;">Sin movimientos en este periodo</td></tr>'}</tbody></table>
    <div class="footer"><p>Este documento fue generado por <span class="brand">BankLite</span></p><p>${esc(fechaGeneracion)} &mdash; Documento informativo</p></div>
  </body></html>`;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); w.print(); }
}

function toPdfMov(t: Mov) {
  return {
    id: t.id_transferencia, id_entrada: t.referencia || t.id_transferencia, monto: t.monto,
    tipo: t.esIngreso ? "Transferencia recibida" : "Transferencia enviada",
    descripcion: [t.esIngreso ? "" : t.benefInfo?.nombre ? `A: ${t.benefInfo.nombre}` : "", t.concepto].filter(Boolean).join(" - "),
    fecha: t.fecha_solicitud, estado: t.estado, signo: t.esIngreso ? "+" : "-",
  };
}

function toISODateLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function short(id: string) { return id.split("-")[0]; }

export default function ClienteMovimientosPage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [saldos, setSaldos] = useState<Record<string, CuentaContable | null>>({});
  const [transferencias, setTransferencias] = useState<Mov[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nombreUsuario, setNombreUsuario] = useState("Cliente");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [selectedTx, setSelectedTx] = useState<Mov | null>(null);
  const [qrModalUrl, setQrModalUrl] = useState<string>("");
  const [copiadoRef, setCopiadoRef] = useState(false);

  useEffect(() => {
    if (selectedTx) {
      const ref = selectedTx.referencia || selectedTx.id_transferencia;
      const payload = `banklite://receipt?ref=${encodeURIComponent(ref)}&amount=${selectedTx.monto}&date=${encodeURIComponent(selectedTx.fecha_solicitud)}`;
      (async () => {
        try {
          const QRCodeLib = (await import("qrcode")).default;
          const u = await QRCodeLib.toDataURL(payload, { margin: 2, width: 280 });
          setQrModalUrl(u);
        } catch {
          setQrModalUrl(`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(payload)}`);
        }
      })();
    } else {
      setQrModalUrl("");
    }
  }, [selectedTx]);

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
          try { saldosMap[c.id_cuenta] = await getLedgerBalance(c.id_cuenta); } catch { saldosMap[c.id_cuenta] = null; }
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
      } catch { setError("No pudimos cargar sus movimientos."); } finally { setLoading(false); }
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 size={40} className="text-white animate-spin" />
      <p className="text-sm text-neutral-400 font-semibold">Cargando movimientos…</p>
    </div>
  );

  if (error) return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 flex items-center gap-4">
      <AlertCircle size={28} className="text-red-400 flex-shrink-0" />
      <p className="text-red-400 font-semibold">{error}</p>
    </div>
  );

  if (cuentas.length === 0) return (
    <div className="apple-glass-card rounded-3xl p-16 text-center space-y-4">
      <div className="inline-flex p-5 rounded-3xl bg-white/[0.04] border border-white/[0.08]">
        <Wallet size={40} className="text-neutral-600" />
      </div>
      <h2 className="text-lg font-extrabold text-white">Aún no tienes cuentas</h2>
      <p className="text-sm text-neutral-500">Comunícate con un asesor para abrir tu cuenta.</p>
    </div>
  );

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Mis Movimientos</h1>
            <p className="text-sm text-neutral-400">Historial contable en doble partida</p>
          </div>
        </div>
        <button
          onClick={() => generarExtractoPDF(filtradas.map(toPdfMov), nombreUsuario, desde, hasta, cuentas[0]?.numero_cuenta ?? undefined)}
          disabled={filtradas.length === 0}
          className="apple-glass-button rounded-2xl px-4 py-2.5 text-sm font-bold text-white flex items-center gap-2 disabled:opacity-40"
        >
          <Download size={16} /> Descargar extracto
        </button>
      </div>

      {/* Tarjetas de saldo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cuentas.map(c => {
          const s = saldos[c.id_cuenta];
          return (
            <div key={c.id_cuenta} className="apple-glass-card rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-4 right-4 opacity-[0.06]"><Wallet size={60} /></div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-1 capitalize">{c.tipo_cuenta} · {c.moneda}</p>
              <p className="text-xs font-mono text-neutral-600 mb-3">{c.numero_cuenta ?? "Sin número"}</p>
              <p className="text-xs text-neutral-500 mb-0.5">Saldo Disponible</p>
              {s ? (
                <p className="text-3xl font-black text-white">${Number(s.saldo_actual).toLocaleString()}</p>
              ) : (
                <p className="text-lg font-bold text-neutral-500">No disponible</p>
              )}
              <div className="mt-4 flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <TrendingUp size={14} /> {c.estado}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filtros + tabla */}
      <div className="apple-glass-card rounded-3xl overflow-hidden">
        {/* Filtros */}
        <div className="px-6 py-4 border-b border-white/[0.06] flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 text-neutral-400">
            <Filter size={14} />
            <span className="text-xs font-bold uppercase tracking-wider">Filtrar por fecha</span>
          </div>
          <label className="text-xs font-semibold text-neutral-500 flex flex-col gap-1">
            <span className="flex items-center gap-1"><Calendar size={12} /> Desde</span>
            <input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)}
              className="bg-white/[0.06] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 transition" />
          </label>
          <label className="text-xs font-semibold text-neutral-500 flex flex-col gap-1">
            <span className="flex items-center gap-1"><Calendar size={12} /> Hasta</span>
            <input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)}
              className="bg-white/[0.06] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 transition" />
          </label>
          {(desde || hasta) && (
            <button onClick={() => { setDesde(""); setHasta(""); }} className="text-xs text-neutral-500 hover:text-white font-semibold transition pb-0.5">
              Limpiar
            </button>
          )}
        </div>

        {/* Lista */}
        {filtradas.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-neutral-500 text-sm">
              {transferencias.length === 0 ? "No has realizado ninguna transferencia todavía." : "No hay movimientos en el rango de fechas seleccionado."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {filtradas.map(t => {
              const benef = t.benefInfo;
              const isError = t.estado === "error" || t.estado === "fallida" || t.estado === "rechazada";
              return (
                <div key={t.id_transferencia} onClick={() => setSelectedTx(t)}
                  className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-white/[0.03] transition cursor-pointer">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-10 w-10 rounded-xl flex-shrink-0 flex items-center justify-center ${isError ? "bg-red-500/10 text-red-400" : t.esIngreso ? "bg-emerald-500/10 text-emerald-400" : "bg-white/[0.06] text-neutral-400"}`}>
                      {t.esIngreso ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-sm truncate">
                        {t.esIngreso ? `De: Cuenta ${short(t.id_cuenta_origen)}` : `A: ${benef ? benef.nombre : "Desconocido"}`}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">
                        Ref: {t.referencia || short(t.id_transferencia)} · {new Date(t.fecha_solicitud).toLocaleDateString("es-CO")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className={`text-sm font-extrabold ${isError ? "text-neutral-500 line-through" : t.esIngreso ? "text-emerald-400" : "text-white"}`}>
                        {t.esIngreso ? "+" : "-"}${Number(t.monto).toLocaleString()}
                      </p>
                      <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${isError ? "text-red-400" : "text-neutral-500"}`}>{t.estado}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); generarComprobantePDF(toPdfMov(t), nombreUsuario); }}
                      className="apple-glass-button rounded-xl p-2 text-neutral-400 hover:text-white transition" title="Comprobante">
                      <FileText size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL COMPROBANTE ESTILO NEQUI EN GRANDE CON QR DE TRANSACCIÓN */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="apple-glass-card rounded-3xl max-w-lg w-full overflow-hidden border border-white/20 shadow-2xl my-auto relative">
            {/* Botón cerrar */}
            <button
              onClick={() => setSelectedTx(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white transition p-2 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] z-10"
            >
              <X size={18} />
            </button>

            {/* Encabezado Nequi */}
            <div className="p-6 sm:p-8 text-center space-y-4 border-b border-white/[0.08]">
              <div className="inline-flex p-3.5 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle size={44} />
              </div>

              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full">
                  ¡Listo! Transacción Exitosa
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-2.5">
                  {selectedTx.esIngreso
                    ? "Te llegó plata a tu cuenta"
                    : `Enviaste a ${selectedTx.benefInfo?.nombre || "Destinatario"}`}
                </h2>
                <p className="text-4xl sm:text-5xl font-black text-white mt-2 font-mono tracking-tight">
                  ${formatNumber(selectedTx.monto)} <span className="text-base text-neutral-400 font-sans">COP</span>
                </p>
              </div>

              {/* QR DINÁMICO DE VERIFICACIÓN DE TRANSACCIÓN */}
              {qrModalUrl && (
                <div className="pt-2">
                  <div className="inline-block p-4 bg-white rounded-3xl shadow-2xl mx-auto">
                    <img
                      src={qrModalUrl}
                      alt="Código QR de Verificación de Transacción"
                      className="w-40 h-40 sm:w-48 sm:h-48 mx-auto rounded-xl"
                    />
                    <div className="mt-2 text-center">
                      <p className="text-[10px] font-black text-black tracking-widest uppercase">
                        Comprobante Verificado Bre-B
                      </p>
                      <p className="text-[9px] font-mono text-neutral-600">
                        Ref: {(selectedTx.referencia || selectedTx.id_transferencia).slice(-10)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* DETALLES DE LA TRANSACCIÓN */}
            <div className="p-6 sm:p-8 space-y-4">
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-3">
                {[
                  {
                    label: selectedTx.esIngreso ? "¿Quién te envió?" : "¿Para quién?",
                    value: selectedTx.esIngreso
                      ? `Cuenta origen ****${selectedTx.id_cuenta_origen.slice(-4)}`
                      : selectedTx.benefInfo?.nombre || "Destinatario BankLite",
                  },
                  ...(selectedTx.benefInfo?.telefono
                    ? [{ label: "Celular asociado", value: `+57 ${selectedTx.benefInfo.telefono}` }]
                    : []),
                  {
                    label: "¿Cuándo?",
                    value: new Date(selectedTx.fecha_solicitud).toLocaleString("es-CO", {
                      dateStyle: "long",
                      timeStyle: "short",
                    }),
                  },
                  {
                    label: "Número de referencia",
                    value: selectedTx.referencia || selectedTx.id_transferencia,
                    canCopy: true,
                  },
                  {
                    label: "Canal de liquidación",
                    value: "Bre-B Sistema de Pagos Inmediatos / ACH",
                  },
                  {
                    label: "Estado",
                    value: selectedTx.estado.charAt(0).toUpperCase() + selectedTx.estado.slice(1),
                  },
                  ...(selectedTx.concepto ? [{ label: "Concepto / Motivo", value: selectedTx.concepto }] : []),
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex justify-between items-center text-xs border-b border-white/[0.06] pb-2.5 last:border-0 last:pb-0"
                  >
                    <span className="text-neutral-400">{item.label}</span>
                    <div className="flex items-center gap-1.5 font-bold text-white text-right max-w-[60%]">
                      <span className="truncate">{item.value}</span>
                      {item.canCopy && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(item.value);
                            setCopiadoRef(true);
                            setTimeout(() => setCopiadoRef(false), 2000);
                          }}
                          className="text-neutral-400 hover:text-white p-1"
                          title="Copiar referencia"
                        >
                          {copiadoRef ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Distintivo de seguridad Fogafín */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px] text-neutral-400">
                <span className="flex items-center gap-1.5 font-semibold">
                  <ShieldCheck size={14} className="text-emerald-400" /> Certificado de pago electrónico
                </span>
                <span className="font-bold text-neutral-500 uppercase tracking-widest text-[10px]">
                  Fogafín Respaldado
                </span>
              </div>

              {/* BOTONES DE ACCIÓN (WHATSAPP + DESCARGA) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const ref = selectedTx.referencia || selectedTx.id_transferencia;
                    const dest = selectedTx.esIngreso
                      ? "Tu cuenta"
                      : selectedTx.benefInfo?.nombre || "Destinatario";
                    const txt =
                      `🏦 *BankLite - Comprobante de Movimiento*\n\n` +
                      `✅ *Estado:* Completada con éxito\n` +
                      `💰 *Monto:* $${formatNumber(selectedTx.monto)} COP\n` +
                      `👤 *${selectedTx.esIngreso ? "Recibido en:" : "Enviado a:"}* ${dest}\n` +
                      `🔢 *Referencia:* ${ref}\n` +
                      `📅 *Fecha:* ${new Date(selectedTx.fecha_solicitud).toLocaleString("es-CO")}\n` +
                      `📝 *Concepto:* ${selectedTx.concepto || "Sin concepto"}\n\n` +
                      `🔐 Transacción respaldada por Red Bre-B & Fogafín.`;
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(txt)}`, "_blank");
                  }}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3.5 rounded-2xl text-xs flex justify-center items-center gap-2 transition active:scale-95 shadow-lg shadow-emerald-500/20"
                >
                  <Share2 size={15} /> Compartir en WhatsApp
                </button>

                <button
                  type="button"
                  onClick={() => generarComprobantePDF(toPdfMov(selectedTx), nombreUsuario)}
                  className="w-full apple-glass-button text-white font-extrabold py-3.5 rounded-2xl text-xs flex justify-center items-center gap-2 transition active:scale-95"
                >
                  <Download size={15} /> Descargar PDF / Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
