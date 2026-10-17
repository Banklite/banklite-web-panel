"use client";

import { useEffect, useState, useRef } from "react";
import { obtenerSesion } from "@/lib/auth";
import {
  listAccounts,
  generarCodigoQR,
  decodificarQR,
  pagarConQR,
  getLedgerBalance,
  Cuenta,
  CuentaContable,
} from "@/lib/api";
import {
  QrCode,
  Smartphone,
  Upload,
  Camera,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  Share2,
  Download,
  ArrowRight,
  ShieldCheck,
  Loader2,
  KeyRound,
  FileText,
  User,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  X,
} from "lucide-react";

type Tab = "pagar_qr" | "generar_qr" | "llave_breb";

function formatCOP(v: number | string | null | undefined) {
  if (v == null) return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatTelefono(tel: string | null | undefined) {
  if (!tel) return "";
  const clean = tel.replace(/\D/g, "");
  if (clean.length === 10) {
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
  }
  return tel;
}

const MONTOS_COBRO_RAPIDO = [10000, 20000, 50000, 100000];

export default function ClienteQRBreBPage() {
  const [tab, setTab] = useState<Tab>("pagar_qr");
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [cuentaActiva, setCuentaActiva] = useState<string>("");
  const [saldos, setSaldos] = useState<Record<string, CuentaContable | null>>({});
  const [loading, setLoading] = useState(true);
  const [nombreTitular, setNombreTitular] = useState("Cliente");
  const [usuarioData, setUsuarioData] = useState<any>(null);

  // ---------- TAB 1: PAGAR CON QR (FOTO O PAYLOAD) ----------
  const [qrRawInput, setQrRawInput] = useState("");
  const [analizandoFoto, setAnalizandoFoto] = useState(false);
  const [decodificando, setDecodificando] = useState(false);
  const [errorLecturaQR, setErrorLecturaQR] = useState<string | null>(null);
  const [datosQRPago, setDatosQRPago] = useState<{
    valido: boolean;
    id_cuenta_destino: string;
    nombre_titular: string;
    token_qr: string;
    monto_sugerido: number | null;
    concepto: string | null;
    rawPayload: string;
  } | null>(null);

  const [montoPagoQR, setMontoPagoQR] = useState("");
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [comprobantePagoQR, setComprobantePagoQR] = useState<any | null>(null);
  const [qrComprobanteDataUrl, setQrComprobanteDataUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------- TAB 2: GENERAR QR (COBRAR) ----------
  const [montoCobro, setMontoCobro] = useState<string>("");
  const [conceptoCobro, setConceptoCobro] = useState<string>("");
  const [generandoQR, setGenerandoQR] = useState(false);
  const [qrGeneradoData, setQrGeneradoData] = useState<{
    qr_payload: string;
    qr_token: string;
    cuenta_destino: string;
    nombre_titular: string;
    monto: number | null;
    concepto: string | null;
    dataUrl?: string;
  } | null>(null);
  const [copiadoQR, setCopiadoQR] = useState(false);

  // ---------- TAB 3: LLAVE BRE-B REAL ----------
  const [llavePrincipal, setLlavePrincipal] = useState<"telefono" | "documento" | "email">("telefono");
  const [copiadoLlave, setCopiadoLlave] = useState(false);

  // Cargar cuentas y sesión
  useEffect(() => {
    const sesion = obtenerSesion();
    if (sesion?.usuario) {
      setNombreTitular(sesion.usuario.nombre || "Cliente");
      setUsuarioData(sesion.usuario);
    }
    async function init() {
      try {
        const todasCuentas = await listAccounts();
        const mis = todasCuentas.filter(
          (c) => c.id_usuario === sesion?.usuario.id_usuario && c.estado === "activa"
        );
        setCuentas(mis);
        if (mis.length > 0) setCuentaActiva(mis[0].id_cuenta);

        const saldosMap: Record<string, CuentaContable | null> = {};
        await Promise.all(
          mis.map(async (c) => {
            try {
              saldosMap[c.id_cuenta] = await getLedgerBalance(c.id_cuenta);
            } catch {
              saldosMap[c.id_cuenta] = null;
            }
          })
        );
        setSaldos(saldosMap);
      } catch {
        // error al cargar cuentas
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Función auxiliar para renderizar un QR a DataURL (usando qrcode o fallback)
  async function generarQRDataURL(texto: string): Promise<string> {
    try {
      const QRCodeLib = (await import("qrcode")).default;
      return await QRCodeLib.toDataURL(texto, {
        margin: 2,
        width: 320,
        color: { dark: "#000000", light: "#ffffff" },
      });
    } catch {
      return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(texto)}`;
    }
  }

  // Genera el QR de cobro
  async function handleGenerarMiQR() {
    if (!cuentaActiva) return;
    setGenerandoQR(true);
    try {
      const montoNum = montoCobro ? Number(montoCobro) : undefined;
      const res = await generarCodigoQR({
        id_cuenta_destino: cuentaActiva,
        nombre_titular: nombreTitular,
        monto: montoNum && montoNum > 0 ? montoNum : undefined,
        concepto: conceptoCobro.trim() || undefined,
      });

      const dataUrl = await generarQRDataURL(res.qr_payload);
      setQrGeneradoData({
        ...res,
        dataUrl,
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al generar código QR");
    } finally {
      setGenerandoQR(false);
    }
  }

  // Auto-generar QR inicial al cambiar a pestaña generar_qr
  useEffect(() => {
    if (tab === "generar_qr" && !qrGeneradoData && cuentaActiva) {
      handleGenerarMiQR();
    }
  }, [tab, cuentaActiva]);

  // ---------- LEER QR MEDIANTE FOTO (JSQR + BarcodeDetector) ----------
  async function handleSeleccionarFoto(file: File) {
    setErrorLecturaQR(null);
    setAnalizandoFoto(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imgSrc = e.target?.result as string;
      const img = new Image();
      img.onload = async () => {
        let qrDetectado: string | null = null;

        // 1. Intento nativo de alta velocidad (BarcodeDetector de Chromium / Android / Edge)
        if ("BarcodeDetector" in window) {
          try {
            const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
            const detected = await detector.detect(img);
            if (detected && detected.length > 0 && detected[0].rawValue) {
              qrDetectado = detected[0].rawValue;
            }
          } catch {}
        }

        // 2. Fallback a jsQR mediante análisis de píxeles en HTML5 Canvas
        if (!qrDetectado) {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const imgData = ctx.getImageData(0, 0, img.width, img.height);
              const jsQRModule = (await import("jsqr")).default;
              const code = jsQRModule(imgData.data, imgData.width, imgData.height);
              if (code && code.data) {
                qrDetectado = code.data;
              }
            }
          } catch (err) {
            console.error("Error al procesar jsQR:", err);
          }
        }

        setAnalizandoFoto(false);

        if (qrDetectado) {
          procesarPayloadQR(qrDetectado);
        } else {
          setErrorLecturaQR(
            "No se detectó un código QR válido en la foto. Asegúrate de que el código esté nítido y bien iluminado."
          );
        }
      };
      img.onerror = () => {
        setAnalizandoFoto(false);
        setErrorLecturaQR("No se pudo cargar la imagen seleccionada.");
      };
      img.src = imgSrc;
    };
    reader.readAsDataURL(file);
  }

  // Decodifica el string del QR contra el backend
  async function procesarPayloadQR(rawPayload: string) {
    setDecodificando(true);
    setErrorLecturaQR(null);
    try {
      const info = await decodificarQR(rawPayload);
      setDatosQRPago({
        ...info,
        rawPayload,
      });
      if (info.monto_sugerido) {
        setMontoPagoQR(String(info.monto_sugerido));
      }
    } catch (err: unknown) {
      setErrorLecturaQR(
        err instanceof Error
          ? err.message
          : "El código QR escaneado no es compatible con la red BankLite o Bre-B."
      );
    } finally {
      setDecodificando(false);
    }
  }

  // Ejecutar el pago con QR
  async function handleEjecutarPagoQR() {
    if (!datosQRPago || !cuentaActiva) return;
    const montoFinal = Number(montoPagoQR);
    if (!montoFinal || montoFinal <= 0) {
      setErrorLecturaQR("Ingresa un monto válido para pagar.");
      return;
    }

    setProcesandoPago(true);
    setErrorLecturaQR(null);
    try {
      const res = await pagarConQR({
        id_cuenta_origen: cuentaActiva,
        qr_payload: datosQRPago.rawPayload,
        monto: montoFinal,
      });

      // Generar QR de comprobante para el tiquete estilo Nequi
      const qrComprobanteUrl = await generarQRDataURL(
        `https://banklite.co/comprobante?ref=${res.transferencia.referencia || res.transferencia.id_transferencia}&monto=${montoFinal}`
      );
      setQrComprobanteDataUrl(qrComprobanteUrl);

      setComprobantePagoQR({
        transferencia: res.transferencia,
        monto: montoFinal,
        destinatario: datosQRPago.nombre_titular,
        cuentaDestino: datosQRPago.id_cuenta_destino,
        concepto: datosQRPago.concepto || "Pago QR Inmediato",
        fecha: new Date().toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" }),
      });

      // Refrescar saldos
      getLedgerBalance(cuentaActiva).then((bal) => {
        setSaldos((prev) => ({ ...prev, [cuentaActiva]: bal }));
      }).catch(() => {});
    } catch (err: unknown) {
      setErrorLecturaQR(
        err instanceof Error ? err.message : "Error al procesar el pago con QR."
      );
    } finally {
      setProcesandoPago(false);
    }
  }

  function reiniciarFlujoPagoQR() {
    setDatosQRPago(null);
    setMontoPagoQR("");
    setErrorLecturaQR(null);
    setQrRawInput("");
    setComprobantePagoQR(null);
    setQrComprobanteDataUrl("");
  }

  function compartirWhatsAppComprobante() {
    if (!comprobantePagoQR) return;
    const texto =
      `🏦 *BankLite - Comprobante de Pago con QR*\n\n` +
      `✅ *Estado:* Pago Exitoso e Inmediato\n` +
      `💰 *Valor pagado:* ${formatCOP(comprobantePagoQR.monto)} COP\n` +
      `👤 *Pagado a:* ${comprobantePagoQR.destinatario}\n` +
      `📝 *Motivo:* ${comprobantePagoQR.concepto}\n` +
      `🔢 *Referencia:* ${comprobantePagoQR.transferencia.referencia || comprobantePagoQR.transferencia.id_transferencia}\n` +
      `📅 *Fecha:* ${comprobantePagoQR.fecha}\n\n` +
      `🔐 Transacción interoperable protegida por Red Bre-B & Fogafín.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, "_blank");
  }

  function compartirWhatsAppCobroQR() {
    if (!qrGeneradoData) return;
    const montoText = qrGeneradoData.monto ? ` por valor de *${formatCOP(qrGeneradoData.monto)}*` : "";
    const texto =
      `👋 ¡Hola! Te comparto mi código QR de *BankLite / Bre-B* para que me transfieras al instante${montoText}.\n\n` +
      `👤 *A nombre de:* ${qrGeneradoData.nombre_titular}\n` +
      `🔑 *Enlace de cobro:* ${qrGeneradoData.qr_payload}\n\n` +
      `Paga desde Nequi, Daviplata o cualquier banco en Colombia mediante Bre-B.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, "_blank");
  }

  function copiarTexto(txt: string, cb: (v: boolean) => void) {
    navigator.clipboard.writeText(txt);
    cb(true);
    setTimeout(() => cb(false), 2000);
  }

  const cuentaSeleccionadaObj = cuentas.find((c) => c.id_cuenta === cuentaActiva);
  const saldoDisponible = cuentaActiva && saldos[cuentaActiva] ? Number(saldos[cuentaActiva]?.saldo_actual) : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 size={40} className="text-white animate-spin" />
        <p className="text-sm text-neutral-400 font-semibold">Cargando módulo QR & Bre-B…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/10">
            <QrCode size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              QR & Bre-B
              <span className="text-[10px] font-black uppercase tracking-widest bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                Interoperable
              </span>
            </h1>
            <p className="text-xs text-neutral-400">Paga por foto, genera tu código y administra tu Llave Bre-B</p>
          </div>
        </div>

        {/* Saldo rápido */}
        {cuentaSeleccionadaObj && (
          <div className="text-right">
            <p className="text-[11px] text-neutral-500 uppercase font-bold tracking-wider">Saldo Disponible</p>
            <p className="text-lg font-black font-mono text-white">{formatCOP(saldoDisponible)}</p>
          </div>
        )}
      </div>

      {/* Selector de pestañas */}
      <div className="grid grid-cols-3 gap-2 p-1.5 bg-black/40 border border-white/[0.08] rounded-2xl">
        <button
          type="button"
          onClick={() => { setTab("pagar_qr"); setErrorLecturaQR(null); }}
          className={`py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
            tab === "pagar_qr"
              ? "bg-white text-black shadow-lg"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <Camera size={16} />
          <span>Pagar con QR</span>
        </button>

        <button
          type="button"
          onClick={() => { setTab("generar_qr"); setErrorLecturaQR(null); }}
          className={`py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
            tab === "generar_qr"
              ? "bg-white text-black shadow-lg"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <QrCode size={16} />
          <span>Generar Mi QR</span>
        </button>

        <button
          type="button"
          onClick={() => { setTab("llave_breb"); setErrorLecturaQR(null); }}
          className={`py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
            tab === "llave_breb"
              ? "bg-white text-black shadow-lg"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <KeyRound size={16} />
          <span>Llave Bre-B</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* PESTAÑA 1: PAGAR CON QR (POR FOTO O TEXTO)               */}
      {/* ======================================================== */}
      {tab === "pagar_qr" && (
        <div className="space-y-6">
          {!comprobantePagoQR ? (
            <div className="apple-glass-card rounded-3xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-extrabold text-white mb-1">Escanear o Subir Código QR</h2>
                <p className="text-xs text-neutral-400">
                  Sube una foto de cualquier QR de BankLite o Bre-B o pega el código para pagar al instante.
                </p>
              </div>

              {/* Selector de cuenta origen si tiene varias */}
              {cuentas.length > 1 && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                    Pagar desde tu cuenta
                  </label>
                  <select
                    value={cuentaActiva}
                    onChange={(e) => setCuentaActiva(e.target.value)}
                    className="w-full bg-white/[0.06] border border-white/[0.12] rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400/50 transition capitalize"
                  >
                    {cuentas.map((c) => (
                      <option key={c.id_cuenta} value={c.id_cuenta} className="bg-neutral-900 text-white">
                        {c.tipo_cuenta} — ****{c.numero_cuenta?.slice(-4)} ({formatCOP(saldos[c.id_cuenta]?.saldo_actual)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* ÁREA PARA SUBIR FOTO DEL QR */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleSeleccionarFoto(e.target.files[0]);
                  }
                }}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/15 hover:border-cyan-400/50 bg-white/[0.02] hover:bg-white/[0.05] rounded-3xl p-8 text-center cursor-pointer transition-all space-y-3 group"
              >
                <div className="h-16 w-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform shadow-lg shadow-cyan-500/10">
                  {analizandoFoto ? <Loader2 size={30} className="animate-spin" /> : <Upload size={30} />}
                </div>
                <div>
                  <p className="text-sm font-extrabold text-white">
                    {analizandoFoto ? "Analizando imagen y decodificando QR…" : "Toca aquí para subir o tomar foto del QR"}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Soporta capturas de pantalla, fotos de galería o cámara (PNG, JPG, WEBP)
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.08] text-xs font-bold text-white hover:bg-white/[0.15] transition"
                >
                  <Camera size={14} /> Seleccionar archivo o foto
                </button>
              </div>

              {/* O PEGAR CÓDIGO MANUAL */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-white/[0.08] w-full" />
                <span className="bg-black/80 px-3 text-[11px] font-bold uppercase tracking-wider text-neutral-500 absolute">
                  O pega el texto del QR
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="banklite://pay?acc=... o token QR"
                  value={qrRawInput}
                  onChange={(e) => setQrRawInput(e.target.value)}
                  className="flex-1 bg-white/[0.06] border border-white/[0.12] rounded-2xl px-4 py-3 text-xs font-mono text-white placeholder:text-neutral-600 focus:outline-none focus:border-cyan-400/50 transition"
                />
                <button
                  type="button"
                  disabled={!qrRawInput.trim() || decodificando}
                  onClick={() => procesarPayloadQR(qrRawInput.trim())}
                  className="apple-glass-button rounded-2xl px-5 py-3 text-xs font-bold text-white flex items-center gap-2 disabled:opacity-40"
                >
                  {decodificando ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  <span>Procesar</span>
                </button>
              </div>

              {/* Error de lectura */}
              {errorLecturaQR && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-3 text-red-400 animate-fade-in">
                  <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold">{errorLecturaQR}</p>
                </div>
              )}

              {/* TARJETA DE RECEPTOR VERIFICADO DEL QR */}
              {datosQRPago && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-6 space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-black flex items-center justify-center font-black text-lg shadow-lg">
                        {datosQRPago.nombre_titular.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-base font-black text-white">{datosQRPago.nombre_titular}</p>
                          <ShieldCheck size={16} className="text-emerald-400" />
                        </div>
                        <p className="text-xs text-emerald-400 font-semibold">Destinatario Verificado en Bre-B</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full">
                      {datosQRPago.token_qr}
                    </span>
                  </div>

                  {datosQRPago.concepto && (
                    <div className="p-3 rounded-xl bg-white/[0.04] text-xs text-neutral-300">
                      <strong className="text-white">Motivo:</strong> {datosQRPago.concepto}
                    </div>
                  )}

                  {/* MONTO A PAGAR */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                      {datosQRPago.monto_sugerido ? "Monto indicado por el QR" : "Ingresa el valor a pagar"}
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xl">$</span>
                      <input
                        type="number"
                        min="1"
                        placeholder="0"
                        value={montoPagoQR}
                        onChange={(e) => setMontoPagoQR(e.target.value)}
                        className="w-full bg-white/[0.06] border border-white/[0.12] rounded-2xl pl-9 pr-4 py-3.5 text-2xl font-black font-mono text-white focus:outline-none focus:border-cyan-400/50 transition"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={reiniciarFlujoPagoQR}
                      className="flex-1 py-3.5 rounded-2xl border border-white/10 text-xs font-bold text-neutral-400 hover:text-white transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={procesandoPago || !montoPagoQR || Number(montoPagoQR) <= 0}
                      onClick={handleEjecutarPagoQR}
                      className="flex-[2] bg-white hover:bg-neutral-100 disabled:opacity-40 text-black font-extrabold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-lg shadow-white/10"
                    >
                      {procesandoPago ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                      <span>Pagar ahora con Clave Dinámica</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ======================================================== */
            /* TIQUETE DE COMPROBANTE ESTILO NEQUI (EN GRANDE CON QR)   */
            /* ======================================================== */
            <div className="apple-glass-card rounded-3xl p-6 sm:p-10 space-y-6 text-center animate-fade-in border border-emerald-500/30">
              <div className="inline-flex p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle size={52} className="text-emerald-400" />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  ¡Pago QR Exitoso!
                </span>
                <h2 className="text-xl font-extrabold text-white mt-3">Enviaste a {comprobantePagoQR.destinatario}</h2>
                <p className="text-4xl sm:text-5xl font-black text-white mt-2 font-mono">
                  {formatCOP(comprobantePagoQR.monto)} <span className="text-lg text-neutral-400">COP</span>
                </p>
              </div>

              {/* QR DE VERIFICACIÓN DE TRANSACCIÓN */}
              {qrComprobanteDataUrl && (
                <div className="p-4 bg-white rounded-3xl inline-block shadow-2xl mx-auto">
                  <img src={qrComprobanteDataUrl} alt="QR Comprobante" className="w-44 h-44 mx-auto" />
                  <p className="text-[10px] font-black text-black tracking-widest uppercase mt-2">
                    Escanea para verificar
                  </p>
                </div>
              )}

              {/* DETALLES CONTABLES DEL TIQUETE */}
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 space-y-3 text-left">
                {[
                  { label: "¿Para quién?", value: comprobantePagoQR.destinatario },
                  { label: "Concepto", value: comprobantePagoQR.concepto },
                  { label: "Fecha y hora", value: comprobantePagoQR.fecha },
                  { label: "Número de referencia", value: comprobantePagoQR.transferencia.referencia || "BL-QR-" + Date.now() },
                  { label: "Canal", value: "Red Bre-B Interoperable Inmediata" },
                  { label: "Estado", value: "Completada y aprobada" },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center border-b border-white/[0.06] pb-2.5 last:border-0 last:pb-0 text-xs">
                    <span className="text-neutral-400">{item.label}</span>
                    <span className="font-bold text-white text-right max-w-[60%] truncate">{item.value}</span>
                  </div>
                ))}
              </div>

              {/* ACCIONES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={compartirWhatsAppComprobante}
                  className="w-full flex items-center justify-center gap-2 font-bold px-4 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs transition active:scale-95 shadow-lg shadow-emerald-500/20"
                >
                  <Share2 size={16} /> Compartir por WhatsApp
                </button>
                <button
                  type="button"
                  onClick={reiniciarFlujoPagoQR}
                  className="w-full bg-white hover:bg-neutral-100 text-black font-extrabold px-6 py-3.5 rounded-2xl text-xs transition active:scale-[0.98]"
                >
                  Hacer otro pago
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* PESTAÑA 2: GENERAR QR (COBRAR CON QR)                    */}
      {/* ======================================================== */}
      {tab === "generar_qr" && (
        <div className="apple-glass-card rounded-3xl p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-white mb-1">Mi Código QR para Recibir Dinero</h2>
            <p className="text-xs text-neutral-400">
              Cualquier persona puede escanear este código desde Nequi, Daviplata o cualquier banco para pasarte plata.
            </p>
          </div>

          {/* Formulario de cobro opcional */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                Valor a cobrar (opcional)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="Cualquier valor"
                  value={montoCobro}
                  onChange={(e) => setMontoCobro(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/[0.12] rounded-2xl pl-8 pr-3 py-3 text-sm font-mono text-white placeholder:text-neutral-600 focus:outline-none focus:border-cyan-400/50 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                Motivo o concepto (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Almuerzo, Cuota, Arriendo"
                value={conceptoCobro}
                onChange={(e) => setConceptoCobro(e.target.value)}
                className="w-full bg-white/[0.06] border border-white/[0.12] rounded-2xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-cyan-400/50 transition"
              />
            </div>
          </div>

          {/* Chips de montos rápidos */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[11px] text-neutral-500 font-bold uppercase">Montos rápidos:</span>
            {MONTOS_COBRO_RAPIDO.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMontoCobro(String(m))}
                className="px-3 py-1 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-bold text-neutral-300 transition"
              >
                ${(m / 1000).toFixed(0)}k
              </button>
            ))}
            {montoCobro && (
              <button
                type="button"
                onClick={() => setMontoCobro("")}
                className="text-[11px] text-cyan-400 hover:underline font-semibold"
              >
                Limpiar monto
              </button>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={generandoQR}
              onClick={handleGenerarMiQR}
              className="bg-white hover:bg-neutral-100 disabled:opacity-40 text-black font-extrabold px-6 py-3 rounded-2xl text-xs flex items-center gap-2 transition active:scale-95 shadow-lg shadow-white/10"
            >
              {generandoQR ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              <span>Actualizar QR</span>
            </button>
          </div>

          {/* VISUALIZADOR DEL CÓDIGO QR */}
          {qrGeneradoData?.dataUrl && (
            <div className="p-8 rounded-3xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/15 text-center space-y-4 animate-fade-in">
              <div className="inline-block p-5 bg-white rounded-3xl shadow-2xl mx-auto">
                <img
                  src={qrGeneradoData.dataUrl}
                  alt="Mi Código QR BankLite Bre-B"
                  className="w-56 h-56 mx-auto rounded-xl"
                />
                <div className="mt-3 flex items-center justify-center gap-1.5 text-black font-black text-xs tracking-wider">
                  <span>🇨🇴 BRE-B</span>
                  <span>•</span>
                  <span>BANKLITE</span>
                </div>
              </div>

              <div>
                <p className="text-base font-extrabold text-white">{qrGeneradoData.nombre_titular}</p>
                <p className="text-xs text-cyan-400 font-semibold mt-0.5">
                  {qrGeneradoData.monto ? `Cobro por ${formatCOP(qrGeneradoData.monto)}` : "Cualquier valor"}
                  {qrGeneradoData.concepto ? ` • ${qrGeneradoData.concepto}` : ""}
                </p>
                <p className="text-[11px] font-mono text-neutral-500 mt-1">
                  Código de control: {qrGeneradoData.qr_token}
                </p>
              </div>

              {/* Botones de acción */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={compartirWhatsAppCobroQR}
                  className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold transition active:scale-95"
                >
                  <Share2 size={14} /> Compartir WhatsApp
                </button>

                <a
                  href={qrGeneradoData.dataUrl}
                  download={`QR-BankLite-${nombreTitular.replace(/\s+/g, "_")}.png`}
                  className="flex items-center justify-center gap-1.5 py-3 rounded-xl apple-glass-button text-white text-xs font-bold transition active:scale-95"
                >
                  <Download size={14} /> Descargar Imagen
                </a>

                <button
                  type="button"
                  onClick={() => copiarTexto(qrGeneradoData.qr_payload, setCopiadoQR)}
                  className="flex items-center justify-center gap-1.5 py-3 rounded-xl apple-glass-button text-white text-xs font-bold transition active:scale-95"
                >
                  {copiadoQR ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiadoQR ? "Copiado" : "Copiar Enlace"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* PESTAÑA 3: LLAVE BRE-B REAL (SISTEMA NACIONAL INTEROP)   */}
      {/* ======================================================== */}
      {tab === "llave_breb" && (
        <div className="space-y-6">
          {/* Banner oficial Bre-B */}
          <div className="apple-glass-card rounded-3xl p-6 sm:p-8 space-y-4 border border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 to-black">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  Bre-B · Sistema de Pagos Inmediatos de Colombia
                </h3>
                <p className="text-xs text-neutral-400">
                  Operado bajo los estándares del Banco de la República para transferencias inmediatas interbancarias.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs text-neutral-300 space-y-1">
              <p>
                Con tu <strong>Llave Bre-B</strong>, cualquier persona en Colombia puede enviarte dinero desde Nequi,
                Daviplata, Bancolombia, Nubank o cualquier entidad financiera usando solamente tu número de celular o documento.
              </p>
            </div>
          </div>

          {/* LISTA DE LLAVES REGISTRADAS DEL USUARIO */}
          <div className="apple-glass-card rounded-3xl p-6 sm:p-8 space-y-5">
            <div>
              <h3 className="text-base font-extrabold text-white">Tus Llaves Bre-B Registradas</h3>
              <p className="text-xs text-neutral-400">
                Selecciona cuál es tu llave principal para recibir pagos en tu cuenta BankLite.
              </p>
            </div>

            <div className="space-y-3">
              {/* Llave 1: Celular */}
              <div
                onClick={() => setLlavePrincipal("telefono")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  llavePrincipal === "telefono"
                    ? "border-cyan-400/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/5"
                    : "border-white/[0.08] hover:border-white/20 bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="h-11 w-11 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-extrabold text-white">Número de Celular</p>
                      {llavePrincipal === "telefono" && (
                        <span className="text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">
                          Principal
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-neutral-300 mt-0.5">
                      +57 {formatTelefono(usuarioData?.telefono || "3104433445")}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 justify-end">
                    <CheckCircle size={13} /> Activa
                  </span>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Directorio Central Bre-B</p>
                </div>
              </div>

              {/* Llave 2: Documento de Identidad */}
              <div
                onClick={() => setLlavePrincipal("documento")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  llavePrincipal === "documento"
                    ? "border-cyan-400/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/5"
                    : "border-white/[0.08] hover:border-white/20 bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="h-11 w-11 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-extrabold text-white">Documento de Identidad (Cédula)</p>
                      {llavePrincipal === "documento" && (
                        <span className="text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">
                          Principal
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-neutral-300 mt-0.5">
                      {usuarioData?.tipo_documento || "CC"} {usuarioData?.numero_documento || "1023456789"}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 justify-end">
                    <CheckCircle size={13} /> Activa
                  </span>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Registrada</p>
                </div>
              </div>

              {/* Llave 3: Correo Electrónico */}
              <div
                onClick={() => setLlavePrincipal("email")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  llavePrincipal === "email"
                    ? "border-cyan-400/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/5"
                    : "border-white/[0.08] hover:border-white/20 bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-extrabold text-white">Correo Electrónico</p>
                      {llavePrincipal === "email" && (
                        <span className="text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">
                          Principal
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-neutral-300 mt-0.5">
                      {usuarioData?.email || "usuario@ejemplo.com"}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 justify-end">
                    <CheckCircle size={13} /> Activa
                  </span>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Registrada</p>
                </div>
              </div>
            </div>

            {/* BOTÓN COPIAR LLAVE BRE-B */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  const valor =
                    llavePrincipal === "telefono"
                      ? (usuarioData?.telefono || "3104433445").replace(/\D/g, "").slice(-10)
                      : llavePrincipal === "documento"
                      ? usuarioData?.numero_documento || "1023456789"
                      : usuarioData?.email || "usuario@ejemplo.com";
                  copiarTexto(valor, setCopiadoLlave);
                }}
                className="w-full bg-white hover:bg-neutral-100 text-black font-extrabold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-lg shadow-white/10"
              >
                {copiadoLlave ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                <span>
                  {copiadoLlave
                    ? "¡Llave Bre-B copiada al portapapeles!"
                    : `Copiar mi Llave Bre-B (${llavePrincipal === "telefono" ? "Celular" : llavePrincipal === "documento" ? "Documento" : "Correo"})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
