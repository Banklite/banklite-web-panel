"use client";

import { useEffect, useMemo, useState } from "react";
import { obtenerSesion } from "@/lib/auth";
import {
  listAccounts,
  getLedgerBalance,
  listTransfers,
  listBeneficiaries,
  Cuenta,
  CuentaContable,
  Transferencia,
  Beneficiario,
} from "@/lib/api";
import {
  FileText,
  TrendingUp,
  Wallet,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Download,
  Calendar,
  Filter,
  Loader2,
  Share2,
  CheckCircle,
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  Search,
  Eye,
  EyeOff,
  Smartphone,
  ChevronRight,
  Receipt,
  Sparkles,
  ArrowRight,
  Printer,
  BadgeCheck,
} from "lucide-react";

type Mov = Transferencia & {
  esIngreso: boolean;
  benefInfo?: Beneficiario;
  esQR?: boolean;
};

function formatNumber(n: number | string) {
  return Number(n).toLocaleString("es-CO");
}

function formatCOP(v: string | number | null | undefined) {
  if (v == null) return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(n);
}

function esc(s: unknown) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c] as string)
  );
}

function short(id: string) {
  return id.split("-")[0];
}

function fechaAmigable(isoString: string) {
  try {
    const d = new Date(isoString);
    const hoy = new Date();
    const esHoy =
      d.getDate() === hoy.getDate() &&
      d.getMonth() === hoy.getMonth() &&
      d.getFullYear() === hoy.getFullYear();

    const hora = d.toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    if (esHoy) {
      return `Hoy · ${hora}`;
    }

    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);
    const esAyer =
      d.getDate() === ayer.getDate() &&
      d.getMonth() === ayer.getMonth() &&
      d.getFullYear() === ayer.getFullYear();

    if (esAyer) {
      return `Ayer · ${hora}`;
    }

    return `${d.toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
    })} · ${hora}`;
  } catch {
    return isoString;
  }
}

// Genera Factura / Comprobante PDF Legal Estilo Nequi
function generarFacturaPDF(mov: Mov, nombreUsuario: string, qrDataUrl?: string) {
  const ref = mov.referencia || mov.id_transferencia;
  const numFactura = "FAC-BL-" + ref.replace(/\D/g, "").slice(-8);
  const fechaStr = new Date(mov.fecha_solicitud).toLocaleString("es-CO", {
    dateStyle: "full",
    timeStyle: "medium",
  });
  const titular = mov.esIngreso
    ? `Cuenta de origen (****${mov.id_cuenta_origen.slice(-4)})`
    : mov.benefInfo?.nombre || "Destinatario BankLite";
  const telefono = mov.benefInfo?.telefono ? `+57 ${mov.benefInfo.telefono}` : "No registrado";
  const concepto = mov.concepto || (mov.esQR ? "Pago por Código QR Bre-B" : "Transferencia Bancaria");

  const qrImgHtml = qrDataUrl
    ? `<img src="${qrDataUrl}" style="width:130px;height:130px;border-radius:12px;display:block;margin:0 auto;" />`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Factura Electrónica Nequi / BankLite - ${esc(ref)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
    body { background: #f8fafc; padding: 30px; color: #0f172a; }
    .invoice-card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 24px; padding: 36px; border: 1px solid #e2e8f0; box-shadow: 0 20px 40px rgba(15,23,42,0.08); }
    .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 24px; margin-bottom: 24px; }
    .badge { display: inline-block; background: #ecfdf5; color: #059669; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 6px 14px; border-radius: 9999px; margin-bottom: 12px; }
    .title { font-size: 20px; font-weight: 900; color: #0f172a; }
    .sub { font-size: 12px; color: #64748b; margin-top: 4px; }
    .amount-box { text-align: center; margin: 20px 0; background: #f8fafc; padding: 20px; border-radius: 18px; border: 1px solid #e2e8f0; }
    .amount-label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 1px; }
    .amount { font-size: 38px; font-weight: 900; color: #0f172a; margin-top: 4px; font-family: monospace; }
    .qr-container { text-align: center; margin: 20px 0; }
    .details { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    .details tr { border-bottom: 1px solid #f1f5f9; }
    .details tr:last-child { border-bottom: none; }
    .details td { padding: 10px 0; }
    .details td.label { color: #64748b; font-weight: 600; }
    .details td.val { text-align: right; font-weight: 800; color: #0f172a; }
    .footer { text-align: center; margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; line-height: 1.6; }
    .footer strong { color: #059669; }
    @media print { body { padding: 0; background: #fff; } .invoice-card { box-shadow: none; border: none; } }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div class="badge">✓ Factura de Pago Exitosa</div>
      <h1 class="title">BankLite · Red Bre-B</h1>
      <p class="sub">Sistema de Pagos Inmediatos e Interoperables de Colombia</p>
    </div>

    <div class="amount-box">
      <div class="amount-label">${mov.esIngreso ? "Dinero Recibido" : "Dinero Enviado"}</div>
      <div class="amount">$${formatNumber(mov.monto)} COP</div>
    </div>

    ${qrDataUrl ? `<div class="qr-container">${qrImgHtml}<p style="font-size:10px;text-transform:uppercase;font-weight:800;color:#64748b;margin-top:6px;letter-spacing:1px;">Escanea para validar autenticidad contable</p></div>` : ""}

    <table class="details">
      <tr>
        <td class="label">Número de Factura:</td>
        <td class="val">${esc(numFactura)}</td>
      </tr>
      <tr>
        <td class="label">Referencia de transacción:</td>
        <td class="val" style="font-family:monospace;">${esc(ref)}</td>
      </tr>
      <tr>
        <td class="label">${mov.esIngreso ? "¿De parte de quién?" : "¿Para quién?"}:</td>
        <td class="val">${esc(titular)}</td>
      </tr>
      <tr>
        <td class="label">Teléfono o cuenta asociada:</td>
        <td class="val">${esc(telefono)}</td>
      </tr>
      <tr>
        <td class="label">Tipo de movimiento:</td>
        <td class="val">${mov.esQR ? "Pago por Código QR Bre-B" : mov.esIngreso ? "Transferencia Recibida" : "Transferencia Enviada"}</td>
      </tr>
      <tr>
        <td class="label">Concepto / Motivo:</td>
        <td class="val">${esc(concepto)}</td>
      </tr>
      <tr>
        <td class="label">Fecha y hora:</td>
        <td class="val">${esc(fechaStr)}</td>
      </tr>
      <tr>
        <td class="label">Canal de compensación:</td>
        <td class="val">Red Inmediata Bre-B / Banco de la República</td>
      </tr>
      <tr>
        <td class="label">Costo de la transacción:</td>
        <td class="val" style="color:#059669;">$0 COP (¡Gratis!)</td>
      </tr>
      <tr>
        <td class="label">Estado de la transacción:</td>
        <td class="val" style="color:#059669;">Aprobada y Asentada en Ledger</td>
      </tr>
    </table>

    <div class="footer">
      <p>Transacción electrónica respaldada por <strong>Fogafín</strong> y auditada con doble partida contable.</p>
      <p>Emitida para: ${esc(nombreUsuario)} &bull; ${esc(fechaStr)}</p>
    </div>
  </div>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    w.print();
  }
}

// Extracto en tabla para descargar todo el rango de movimientos
function generarExtractoPDF(
  movs: Mov[],
  nombreUsuario: string,
  desde: string,
  hasta: string,
  numeroCuenta?: string
) {
  const filas = movs
    .map(
      (m, i) => `
    <tr style="${i % 2 === 1 ? "background:#f8fafc;" : ""}">
      <td>${new Date(m.fecha_solicitud).toLocaleDateString("es-CO")}</td>
      <td>${m.esQR ? "Pago QR Bre-B" : m.esIngreso ? "Recibido" : "Enviado"}</td>
      <td>${esc([m.esIngreso ? "De: Cuenta" : m.benefInfo?.nombre ? `A: ${m.benefInfo.nombre}` : "", m.concepto].filter(Boolean).join(" - ") || "Sin motivo")}</td>
      <td><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase;${
        m.estado === "completada"
          ? "background:#ecfdf5;color:#059669;"
          : "background:#fef2f2;color:#dc2626;"
      }">${esc(m.estado)}</span></td>
      <td style="text-align:right;font-weight:700;font-family:monospace;${
        m.esIngreso ? "color:#059669;" : "color:#0f172a;"
      }">${m.esIngreso ? "+" : "-"}$${formatNumber(m.monto)}</td>
    </tr>`
    )
    .join("");

  const totalEnviado = movs
    .filter((m) => !m.esIngreso)
    .reduce((s, m) => s + Number(m.monto), 0);
  const totalRecibido = movs
    .filter((m) => m.esIngreso)
    .reduce((s, m) => s + Number(m.monto), 0);
  const rangoDesde = desde || "Inicio";
  const rangoHasta = hasta || new Date().toLocaleDateString("es-CO");
  const fechaGeneracion = new Date().toLocaleString("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const html = `<html>
<head>
  <title>Extracto de Movimientos BankLite - Bre-B</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    body { padding:40px; color:#0f172a; background:#fff; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #0284c7; padding-bottom:16px; margin-bottom:24px; }
    .logo { font-size:26px; font-weight:900; color:#0284c7; }
    .logo-sub { font-size:11px; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; }
    .doc-title { font-size:18px; font-weight:800; text-align:right; color:#0f172a; }
    .doc-meta { font-size:12px; color:#64748b; text-align:right; margin-top:4px; }
    .info-row { display:flex; gap:24px; margin-bottom:24px; flex-wrap:wrap; background:#f8fafc; padding:16px; border-radius:12px; }
    .info-label { font-size:10px; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:1px; }
    .info-value { font-size:13px; font-weight:800; color:#0f172a; margin-top:2px; }
    .summary { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:28px; }
    .summary-card { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; }
    .summary-card .label { font-size:10px; color:#64748b; text-transform:uppercase; font-weight:700; }
    .summary-card .value { font-size:20px; font-weight:900; margin-top:4px; font-family:monospace; }
    .summary-card.green .value { color:#059669; }
    .summary-card.red .value { color:#dc2626; }
    table { width:100%; border-collapse:collapse; font-size:12px; }
    th { background:#0284c7; color:white; padding:10px 12px; text-align:left; font-weight:700; text-transform:uppercase; font-size:11px; }
    th:last-child { text-align:right; }
    td { padding:10px 12px; border-bottom:1px solid #e2e8f0; }
    .footer { margin-top:36px; padding-top:16px; border-top:1px solid #e2e8f0; text-align:center; font-size:11px; color:#94a3b8; }
    @media print { body { padding:20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">BankLite</div>
      <div class="logo-sub">Banca Digital Interoperable Bre-B</div>
    </div>
    <div>
      <div class="doc-title">Extracto Contable de Movimientos</div>
      <div class="doc-meta">Generado el ${esc(fechaGeneracion)}</div>
    </div>
  </div>

  <div class="info-row">
    <div><div class="info-label">Cliente</div><div class="info-value">${esc(nombreUsuario)}</div></div>
    ${numeroCuenta ? `<div><div class="info-label">Cuenta Principal</div><div class="info-value">${esc(numeroCuenta)}</div></div>` : ""}
    <div><div class="info-label">Periodo Desde</div><div class="info-value">${esc(rangoDesde)}</div></div>
    <div><div class="info-label">Periodo Hasta</div><div class="info-value">${esc(rangoHasta)}</div></div>
  </div>

  <div class="summary">
    <div class="summary-card"><div class="label">Total Movimientos</div><div class="value">${movs.length}</div></div>
    <div class="summary-card green"><div class="label">Total Recibido</div><div class="value">+$${formatNumber(totalRecibido)}</div></div>
    <div class="summary-card red"><div class="label">Total Enviado</div><div class="value">-$${formatNumber(totalEnviado)}</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Canal</th>
        <th>Descripción / Motivo</th>
        <th>Estado</th>
        <th style="text-align:right;">Valor</th>
      </tr>
    </thead>
    <tbody>
      ${filas || '<tr><td colspan="5" style="text-align:center;padding:24px;color:#94a3b8;">Sin movimientos en este periodo</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    <p>Documento oficial emitido por <strong>BankLite</strong> bajo regulación de la Superfinanciera y Fogafín.</p>
  </div>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    w.print();
  }
}

export default function ClienteMovimientosPage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [saldos, setSaldos] = useState<Record<string, CuentaContable | null>>({});
  const [transferencias, setTransferencias] = useState<Mov[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nombreUsuario, setNombreUsuario] = useState("Cliente");

  // Filtros interactivos estilo Nequi
  const [tabFiltro, setTabFiltro] = useState<"todos" | "qr" | "envios" | "entradas">("todos");
  const [busqueda, setBusqueda] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [mostrarSaldo, setMostrarSaldo] = useState(true);

  // Modal de Factura / Comprobante grande con QR
  const [selectedTx, setSelectedTx] = useState<Mov | null>(null);
  const [qrModalUrl, setQrModalUrl] = useState<string>("");
  const [copiadoRef, setCopiadoRef] = useState(false);
  const [copiadoFactura, setCopiadoFactura] = useState(false);

  // Genera QR dinámico para el movimiento seleccionado
  useEffect(() => {
    if (selectedTx) {
      const ref = selectedTx.referencia || selectedTx.id_transferencia;
      const numFactura = "FAC-BL-" + ref.replace(/\D/g, "").slice(-8);
      const payload = `banklite://invoice?num=${encodeURIComponent(numFactura)}&ref=${encodeURIComponent(
        ref
      )}&amt=${selectedTx.monto}&date=${encodeURIComponent(
        selectedTx.fecha_solicitud
      )}&qr=${selectedTx.esQR ? "1" : "0"}`;

      (async () => {
        try {
          const QRCodeLib = (await import("qrcode")).default;
          const u = await QRCodeLib.toDataURL(payload, {
            margin: 2,
            width: 320,
            color: { dark: "#0f172a", light: "#ffffff" },
          });
          setQrModalUrl(u);
        } catch {
          setQrModalUrl(
            `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
              payload
            )}`
          );
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
        const misCuentas = todasCuentas.filter(
          (c) => c.id_usuario === sesion?.usuario.id_usuario
        );
        setCuentas(misCuentas);

        const saldosMap: Record<string, CuentaContable | null> = {};
        await Promise.all(
          misCuentas.map(async (c) => {
            try {
              saldosMap[c.id_cuenta] = await getLedgerBalance(c.id_cuenta);
            } catch {
              saldosMap[c.id_cuenta] = null;
            }
          })
        );
        setSaldos(saldosMap);

        const [todasTrans, todosBenef] = await Promise.all([
          listTransfers(),
          listBeneficiaries(),
        ]);
        const miIdsCuentas = misCuentas.map((c) => c.id_cuenta);

        const misMovs = todasTrans
          .map((t) => {
            const benef = todosBenef.find(
              (b) => b.id_beneficiario === t.id_beneficiario
            );
            const soyOrigen = miIdsCuentas.includes(t.id_cuenta_origen);
            const soyDestino = benef && miIdsCuentas.includes(benef.cuenta_destino);

            // Detección de pago QR (por concepto o referencia o alias)
            const conc = (t.concepto || "").toLowerCase();
            const ref = (t.referencia || "").toLowerCase();
            const esQR =
              conc.includes("qr") ||
              ref.includes("qr") ||
              conc.includes("cobro qr") ||
              Boolean(
                benef &&
                  ((benef.nombre && benef.nombre.toLowerCase().includes("qr")) ||
                    (benef.alias && benef.alias.toLowerCase().includes("qr")))
              );

            if (soyOrigen) return { ...t, esIngreso: false, benefInfo: benef, esQR };
            if (soyDestino) return { ...t, esIngreso: true, benefInfo: benef, esQR };
            return null;
          })
          .filter(Boolean) as Mov[];

        misMovs.sort(
          (a, b) =>
            new Date(b.fecha_solicitud).getTime() - new Date(a.fecha_solicitud).getTime()
        );
        setTransferencias(misMovs);
      } catch {
        setError("No pudimos cargar sus movimientos.");
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  // Filtrado reactivo por pestañas Nequi, búsqueda y fechas
  const filtradas = useMemo(() => {
    return transferencias.filter((t) => {
      // Filtro pestaña Nequi
      if (tabFiltro === "qr" && !t.esQR) return false;
      if (tabFiltro === "envios" && t.esIngreso) return false;
      if (tabFiltro === "entradas" && !t.esIngreso) return false;

      // Filtro búsqueda en vivo
      if (busqueda.trim()) {
        const query = busqueda.toLowerCase();
        const nombre = (t.benefInfo?.nombre || "").toLowerCase();
        const concepto = (t.concepto || "").toLowerCase();
        const ref = (t.referencia || t.id_transferencia).toLowerCase();
        const telefono = (t.benefInfo?.telefono || "").toLowerCase();
        const monto = String(t.monto);
        const match =
          nombre.includes(query) ||
          concepto.includes(query) ||
          ref.includes(query) ||
          telefono.includes(query) ||
          monto.includes(query);
        if (!match) return false;
      }

      // Filtro por fechas
      const f = toISODateLocal(new Date(t.fecha_solicitud));
      if (desde && f < desde) return false;
      if (hasta && f > hasta) return false;

      return true;
    });
  }, [transferencias, tabFiltro, busqueda, desde, hasta]);

  function toISODateLocal(d: Date) {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  // Métricas rápidas estilo Nequi
  const conteoQR = useMemo(() => transferencias.filter((t) => t.esQR).length, [transferencias]);
  const conteoEnvios = useMemo(() => transferencias.filter((t) => !t.esIngreso).length, [transferencias]);
  const conteoEntradas = useMemo(() => transferencias.filter((t) => t.esIngreso).length, [transferencias]);

  const saldoTotal = useMemo(() => {
    return Object.values(saldos).reduce((acc, s) => acc + (s ? Number(s.saldo_actual) : 0), 0);
  }, [saldos]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 size={42} className="text-sky-600 animate-spin" />
        <p className="text-sm text-slate-500 font-semibold tracking-wide">
          Cargando tus movimientos Nequi…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-3xl p-8 flex items-center gap-4 text-red-600 max-w-2xl mx-auto shadow-sm">
        <AlertCircle size={28} className="flex-shrink-0" />
        <p className="text-sm font-semibold">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 font-sans text-slate-900">
      {/* ======================================================== */}
      {/* ENCABEZADO Y TARJETA DE SALDO DISPONIBLE ESTILO NEQUI    */}
      {/* ======================================================== */}
      <div className="apple-glass-card rounded-[32px] p-6 sm:p-8 space-y-6 shadow-xl border border-white/95">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="apple-icon-badge h-14 w-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25">
              <Receipt size={26} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs text-sky-700 font-extrabold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Historial Contable en Tiempo Real
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                Tus Movimientos
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Revisa pagos con QR, envíos a celular Bre-B y descarga tus facturas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                generarExtractoPDF(
                  filtradas,
                  nombreUsuario,
                  desde,
                  hasta,
                  cuentas[0]?.numero_cuenta ?? undefined
                )
              }
              disabled={filtradas.length === 0}
              className="apple-glass-button rounded-2xl px-4 py-2.5 text-xs font-black text-slate-800 hover:text-slate-950 flex items-center gap-2 transition-all duration-200 active:scale-[0.97] hover:scale-[1.02] disabled:opacity-40 shadow-sm"
            >
              <Download size={15} />
              <span>Descargar Extracto</span>
            </button>
          </div>
        </div>

        {/* Banner de Saldo Total Nequi con Toggle para Ocultar */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-4 shadow-xl border border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-slate-300 font-black">
                Saldo Total Disponible
              </span>
              <button
                type="button"
                onClick={() => setMostrarSaldo(!mostrarSaldo)}
                className="text-slate-400 hover:text-white transition-all duration-200 active:scale-90 p-1.5 rounded-xl hover:bg-white/10"
                title={mostrarSaldo ? "Ocultar saldo" : "Mostrar saldo"}
              >
                {mostrarSaldo ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-3xl sm:text-4xl font-black font-mono tracking-tight mt-1 text-white">
              {mostrarSaldo ? formatCOP(saldoTotal) : "••••••••••"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                {cuentas.length} {cuentas.length === 1 ? "Cuenta Activa" : "Cuentas Activas"}
              </p>
              <p className="text-xs font-bold text-emerald-400 flex items-center gap-1 justify-end mt-0.5">
                <ShieldCheck size={14} /> Red Bre-B Conectada
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PESTAÑAS SELECTORAS ESTILO NEQUI (EN GRANDE)             */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={() => setTabFiltro("todos")}
          className={`p-3.5 rounded-2xl border text-left transition-all duration-200 active:scale-[0.97] hover:scale-[1.01] flex items-center justify-between ${
            tabFiltro === "todos"
              ? "bg-slate-950 text-white border-slate-950 shadow-md shadow-slate-950/20"
              : "bg-white border-slate-200/80 hover:border-slate-300 text-slate-700 shadow-xs"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Receipt size={18} className={tabFiltro === "todos" ? "text-sky-300" : "text-slate-500"} />
            <div>
              <p className="text-xs font-black">Todos</p>
              <p className={`text-[10px] ${tabFiltro === "todos" ? "text-slate-300 font-medium" : "text-slate-400 font-medium"}`}>
                Historial completo
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-mono font-black px-2 py-0.5 rounded-full ${
              tabFiltro === "todos" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700 font-black"
            }`}
          >
            {transferencias.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTabFiltro("qr")}
          className={`p-3.5 rounded-2xl border text-left transition-all duration-200 active:scale-[0.97] hover:scale-[1.01] flex items-center justify-between ${
            tabFiltro === "qr"
              ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/25"
              : "bg-white border-slate-200/80 hover:border-slate-300 text-slate-700 shadow-xs"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <QrCode size={18} className={tabFiltro === "qr" ? "text-purple-200" : "text-purple-600"} />
            <div>
              <p className="text-xs font-black">Pagos QR</p>
              <p className={`text-[10px] ${tabFiltro === "qr" ? "text-purple-200 font-medium" : "text-slate-400 font-medium"}`}>
                Bre-B & Comercios
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-mono font-black px-2 py-0.5 rounded-full ${
              tabFiltro === "qr" ? "bg-white/20 text-white" : "bg-purple-50 text-purple-700 font-black"
            }`}
          >
            {conteoQR}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTabFiltro("envios")}
          className={`p-3.5 rounded-2xl border text-left transition-all duration-200 active:scale-[0.97] hover:scale-[1.01] flex items-center justify-between ${
            tabFiltro === "envios"
              ? "bg-slate-950 text-white border-slate-950 shadow-md shadow-slate-950/20"
              : "bg-white border-slate-200/80 hover:border-slate-300 text-slate-700 shadow-xs"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <ArrowUpRight size={18} className={tabFiltro === "envios" ? "text-rose-300" : "text-rose-500"} />
            <div>
              <p className="text-xs font-black">Plata enviada</p>
              <p className={`text-[10px] ${tabFiltro === "envios" ? "text-slate-300 font-medium" : "text-slate-400 font-medium"}`}>
                Salidas y transferencias
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-mono font-black px-2 py-0.5 rounded-full ${
              tabFiltro === "envios" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700 font-black"
            }`}
          >
            {conteoEnvios}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTabFiltro("entradas")}
          className={`p-3.5 rounded-2xl border text-left transition-all duration-200 active:scale-[0.97] hover:scale-[1.01] flex items-center justify-between ${
            tabFiltro === "entradas"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/25"
              : "bg-white border-slate-200/80 hover:border-slate-300 text-slate-700 shadow-xs"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <ArrowDownLeft size={18} className={tabFiltro === "entradas" ? "text-emerald-200" : "text-emerald-600"} />
            <div>
              <p className="text-xs font-black">Plata recibida</p>
              <p className={`text-[10px] ${tabFiltro === "entradas" ? "text-emerald-200 font-medium" : "text-slate-400 font-medium"}`}>
                Abonos en cuenta
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-mono font-black px-2 py-0.5 rounded-full ${
              tabFiltro === "entradas" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700 font-black"
            }`}
          >
            {conteoEntradas}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* BARRA DE BÚSQUEDA Y FILTRADO POR FECHA                   */}
      {/* ======================================================== */}
      <div className="apple-glass-card rounded-2xl p-4 flex flex-wrap items-center gap-3 shadow-sm border border-slate-200/80">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por persona, QR, celular, concepto o referencia..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white transition"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={desde}
            max={hasta || undefined}
            onChange={(e) => setDesde(e.target.value)}
            className="bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-sky-500"
            title="Fecha desde"
          />
          <span className="text-slate-400 text-xs">a</span>
          <input
            type="date"
            value={hasta}
            min={desde || undefined}
            onChange={(e) => setHasta(e.target.value)}
            className="bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-sky-500"
            title="Fecha hasta"
          />
          {(desde || hasta) && (
            <button
              onClick={() => {
                setDesde("");
                setHasta("");
              }}
              className="text-xs font-bold text-sky-600 hover:underline px-1"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* LISTA DE MOVIMIENTOS EN GRANDE (ESTILO NEQUI)            */}
      {/* ======================================================== */}
      <div className="space-y-3">
        {filtradas.length === 0 ? (
          <div className="apple-glass-card rounded-3xl p-12 text-center space-y-3 border border-slate-200/80">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Receipt size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-800">No encontramos movimientos</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No hay transacciones registradas con los filtros actuales. Intenta cambiar de pestaña o limpiar el buscador.
            </p>
          </div>
        ) : (
          filtradas.map((t) => {
            const isError =
              t.estado === "error" || t.estado === "fallida" || t.estado === "rechazada";

            const nombreDest = t.esIngreso
              ? `Transferencia recibida`
              : t.benefInfo?.nombre || (t.esQR ? "Comercio QR Bre-B" : "Destinatario BankLite");

            const conceptoText =
              t.concepto?.trim() ||
              (t.esQR
                ? "Pago por código QR"
                : t.esIngreso
                ? "Abono inmediato en cuenta"
                : "Transferencia a cuenta");

            return (
              <div
                key={t.id_transferencia}
                onClick={() => setSelectedTx(t)}
                className="apple-glass-card rounded-[28px] p-5 sm:p-6 transition-all duration-200 cursor-pointer apple-spring hover:border-sky-300 hover:shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group border border-white/95"
              >
                {/* Lado izquierdo: Ícono grande + Información */}
                <div className="flex items-center gap-4 min-w-0">
                  {/* Ícono grande Nequi / Avatar personalizado */}
                  <div
                    className={`h-14 w-14 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-md transition-transform group-hover:scale-105 apple-spring ${
                      isError
                        ? "bg-red-50 text-red-600 border border-red-200"
                        : t.esQR
                        ? "bg-gradient-to-tr from-purple-500 to-indigo-600 text-white shadow-purple-500/25"
                        : t.esIngreso
                        ? "bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-emerald-500/25"
                        : t.benefInfo?.nombre
                        ? "bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-black text-xl shadow-sky-500/25"
                        : "bg-slate-900 text-white shadow-slate-900/15"
                    }`}
                  >
                    {isError ? (
                      <AlertCircle size={26} />
                    ) : t.esQR ? (
                      <QrCode size={26} />
                    ) : t.esIngreso ? (
                      <ArrowDownLeft size={28} />
                    ) : t.benefInfo?.nombre ? (
                      <span>{t.benefInfo.nombre.charAt(0).toUpperCase()}</span>
                    ) : t.benefInfo?.telefono ? (
                      <Smartphone size={26} />
                    ) : (
                      <ArrowUpRight size={28} />
                    )}
                  </div>

                  {/* Textos descriptivos */}
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base sm:text-lg font-black text-slate-950 truncate tracking-tight">
                        {nombreDest}
                      </span>
                      {t.esQR && (
                        <span className="text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                          Pago QR
                        </span>
                      )}
                      {!t.esQR && t.benefInfo?.telefono && (
                        <span className="text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full">
                          Celular
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 font-medium truncate">
                      {conceptoText}
                    </p>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-semibold">
                      <span>{fechaAmigable(t.fecha_solicitud)}</span>
                      <span>•</span>
                      <span className="font-mono">Ref: {short(t.referencia || t.id_transferencia)}</span>
                    </div>
                  </div>
                </div>

                {/* Lado derecho: Monto en GIGANTE + Estado + Botón Factura */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 gap-2">
                  <div className="sm:text-right">
                    <p
                      className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                        isError
                          ? "text-slate-400 line-through"
                          : t.esIngreso
                          ? "text-emerald-600"
                          : "text-slate-950"
                      }`}
                    >
                      {t.esIngreso ? "+" : "-"}${formatNumber(t.monto)}
                    </p>
                    <div className="flex items-center gap-1.5 justify-end">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isError
                            ? "bg-red-50 text-red-600"
                            : "bg-emerald-50 text-emerald-700 font-extrabold"
                        }`}
                      >
                        {isError ? t.estado : "Exitosa ✓"}
                      </span>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 group-hover:text-sky-700 group-hover:translate-x-1 transition-transform">
                    <span>Ver Factura & QR</span>
                    <ChevronRight size={15} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL DE FACTURA Y COMPROBANTE DIGITAL NEQUI (EN GRANDE) */}
      {/* ======================================================== */}
      {selectedTx && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="apple-glass-card rounded-[32px] max-w-lg w-full overflow-hidden border border-white/95 shadow-2xl my-auto relative max-h-[92vh] flex flex-col">
            {/* Botón cerrar */}
            <button
              onClick={() => setSelectedTx(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 transition p-2 rounded-full bg-slate-100 hover:bg-slate-200 z-20"
              title="Cerrar factura"
            >
              <X size={18} />
            </button>

            {/* Encabezado Nequi con Título y Estado */}
            <div className="overflow-y-auto p-6 sm:p-8 space-y-6">
              <div className="text-center space-y-3 pt-2">
                <div className="inline-flex p-3.5 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-md shadow-emerald-500/10">
                  <CheckCircle size={46} />
                </div>

                <div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full">
                    ¡Listo! Transacción Aprobada
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-950 mt-2.5 tracking-tight">
                    {selectedTx.esIngreso
                      ? "Te llegó plata a tu cuenta"
                      : `Enviaste a ${selectedTx.benefInfo?.nombre || (selectedTx.esQR ? "Comercio QR" : "Destinatario")}`}
                  </h2>
                  <p className="text-4xl sm:text-5xl font-black text-slate-950 mt-2 font-mono tracking-tight">
                    ${formatNumber(selectedTx.monto)} <span className="text-base text-slate-400 font-sans">COP</span>
                  </p>
                </div>
              </div>

              {/* =================================================== */}
              {/* CÓDIGO QR DE SEGURIDAD CONTABLE EN GRANDE           */}
              {/* =================================================== */}
              {qrModalUrl && (
                <div className="text-center py-1">
                  <div className="p-4 bg-white border border-slate-200/90 rounded-3xl inline-block shadow-xl mx-auto">
                    <img
                      src={qrModalUrl}
                      alt="Código QR de Verificación de Factura"
                      className="w-44 h-44 sm:w-52 sm:h-52 mx-auto rounded-xl"
                    />
                    <div className="mt-2.5 text-center">
                      <p className="text-[10px] font-black text-slate-900 tracking-widest uppercase flex items-center justify-center gap-1">
                        <BadgeCheck size={14} className="text-emerald-600" />
                        Comprobante Oficial Bre-B
                      </p>
                      <p className="text-[9px] font-mono text-slate-400 mt-0.5">
                        Token: {(selectedTx.referencia || selectedTx.id_transferencia).replace(/\D/g, "").slice(-8) || "VERIF-OK"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* =================================================== */}
              {/* DATOS DE FACTURA Y PAGO DETALLADOS                  */}
              {/* =================================================== */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 space-y-3.5 text-left shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Receipt size={14} className="text-sky-600" /> Factura Electrónica
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    FAC-BL-{(selectedTx.referencia || selectedTx.id_transferencia).replace(/\D/g, "").slice(-8)}
                  </span>
                </div>

                {[
                  {
                    label: selectedTx.esIngreso ? "¿Quién te envió?" : "¿Para quién?",
                    value: selectedTx.esIngreso
                      ? `Cuenta origen (****${selectedTx.id_cuenta_origen.slice(-4)})`
                      : selectedTx.benefInfo?.nombre || "Destinatario BankLite",
                  },
                  ...(selectedTx.benefInfo?.telefono
                    ? [{ label: "Celular asociado", value: `+57 ${selectedTx.benefInfo.telefono}` }]
                    : []),
                  {
                    label: "Canal / Método",
                    value: selectedTx.esQR
                      ? "Pago por Código QR Bre-B"
                      : selectedTx.esIngreso
                      ? "Abono directo Bre-B"
                      : "Transferencia por celular",
                  },
                  {
                    label: "Concepto / Motivo",
                    value: selectedTx.concepto || "Sin motivo registrado",
                  },
                  {
                    label: "Fecha y hora exacta",
                    value: new Date(selectedTx.fecha_solicitud).toLocaleString("es-CO", {
                      dateStyle: "full",
                      timeStyle: "short",
                    }),
                  },
                  {
                    label: "Número de referencia",
                    value: selectedTx.referencia || selectedTx.id_transferencia,
                    canCopy: true,
                  },
                  {
                    label: "Costo por movimiento",
                    value: "$0 COP (¡Siempre gratis!)",
                    highlightGreen: true,
                  },
                  {
                    label: "Estado en Ledger",
                    value: "Aprobada & Asentada ✓",
                    highlightGreen: true,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex justify-between items-center text-xs border-b border-slate-200/70 pb-2.5 last:border-0 last:pb-0"
                  >
                    <span className="text-slate-500 font-semibold">{item.label}</span>
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-right max-w-[60%]">
                      <span
                        className={`truncate ${
                          item.highlightGreen ? "text-emerald-700 font-extrabold" : ""
                        }`}
                      >
                        {item.value}
                      </span>
                      {item.canCopy && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(item.value);
                            setCopiadoRef(true);
                            setTimeout(() => setCopiadoRef(false), 2000);
                          }}
                          className="text-slate-400 hover:text-slate-800 p-1"
                          title="Copiar referencia"
                        >
                          {copiadoRef ? (
                            <Check size={12} className="text-emerald-600" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Distintivo de seguridad Fogafín y Red Bre-B */}
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-[11px] text-emerald-800 font-semibold">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-emerald-600" /> Factura electrónica respaldada
                </span>
                <span className="font-extrabold uppercase tracking-widest text-[10px]">
                  Fogafín Seguro
                </span>
              </div>

              {/* Botones de acción Nequi: WhatsApp + PDF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const ref = selectedTx.referencia || selectedTx.id_transferencia;
                    const dest = selectedTx.esIngreso
                      ? "Tu cuenta"
                      : selectedTx.benefInfo?.nombre || (selectedTx.esQR ? "Comercio QR" : "Destinatario");
                    const txt =
                      `🏦 *BankLite / Bre-B - Comprobante de Movimiento*\n\n` +
                      `✅ *Estado:* ¡Pago Exitoso!\n` +
                      `💰 *Valor:* $${formatNumber(selectedTx.monto)} COP\n` +
                      `👤 *${selectedTx.esIngreso ? "Recibido de:" : "Enviado a:"}* ${dest}\n` +
                      `📱 *Canal:* ${selectedTx.esQR ? "Código QR Bre-B" : "Transferencia Celular"}\n` +
                      `🔢 *Referencia:* ${ref}\n` +
                      `📅 *Fecha:* ${new Date(selectedTx.fecha_solicitud).toLocaleString("es-CO")}\n` +
                      `📝 *Concepto:* ${selectedTx.concepto || "Sin concepto"}\n\n` +
                      `🔐 Verificado por Red Bre-B y respaldado por Fogafín.`;
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(txt)}`, "_blank");
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl text-xs sm:text-sm flex justify-center items-center gap-2 transition-all duration-200 active:scale-[0.97] hover:scale-[1.02] shadow-md shadow-emerald-600/20"
                >
                  <Share2 size={16} /> Compartir por WhatsApp
                </button>

                <button
                  type="button"
                  onClick={() => generarFacturaPDF(selectedTx, nombreUsuario, qrModalUrl)}
                  className="w-full apple-primary-button font-black py-4 rounded-2xl text-xs sm:text-sm flex justify-center items-center gap-2 transition-all duration-200 active:scale-[0.97] hover:scale-[1.02] shadow-md shadow-sky-500/25"
                >
                  <Printer size={16} /> Imprimir / Guardar Factura
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
