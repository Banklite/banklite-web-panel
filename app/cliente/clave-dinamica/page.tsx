"use client";

import { useEffect, useState } from "react";
import { obtenerSesion } from "@/lib/auth";
import { configurarPIN, obtenerStatusPIN } from "@/lib/api";
import {
  KeyRound,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  Lock,
  Sparkles,
  Info,
  ArrowRight,
  Shield,
  Zap,
  Fingerprint,
  Smartphone,
} from "lucide-react";
import { useClaveDinamica } from "@/context/ClaveDinamicaContext";

export default function ClaveDinamicaPage() {
  const { clave, cargando, segundosRestantes, error: errorClave, regenerar, setIdUsuario } = useClaveDinamica();
  const [idUsuario, setIdUsuarioLocal] = useState<string | null>(null);
  const [nombreUsuario, setNombreUsuario] = useState<string>("Cliente");
  const [copiado, setCopiado] = useState<boolean>(false);
  const [mensajeInfo, setMensajeInfo] = useState<string | null>(null);

  // Gestión de PIN de 4 dígitos (estilo Nequi)
  const [tienePin, setTienePin] = useState<boolean>(false);
  const [nuevoPin, setNuevoPin] = useState<string>("");
  const [confirmarPin, setConfirmarPin] = useState<string>("");
  const [guardandoPin, setGuardandoPin] = useState<boolean>(false);
  const [pinMensaje, setPinMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [mostrarFormPin, setMostrarFormPin] = useState<boolean>(false);

  useEffect(() => {
    const s = obtenerSesion();
    if (!s) return;
    const uid = s.usuario.id_usuario;
    setIdUsuarioLocal(uid);
    setIdUsuario(uid);
    setNombreUsuario(s.usuario.nombre || "Cliente");

    setMensajeInfo("Clave dinámica sincronizada y cifrada en tiempo real.");

    obtenerStatusPIN(uid)
      .then((res) => setTienePin(res.tiene_pin))
      .catch(() => setTienePin(false));
  }, [setIdUsuario]);

  function copiarClave() {
    if (clave) {
      navigator.clipboard.writeText(clave);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }
  }

  async function handleGuardarPIN(e: React.FormEvent) {
    e.preventDefault();
    if (!idUsuario) return;
    setPinMensaje(null);

    if (nuevoPin.length !== 4 || !/^\d{4}$/.test(nuevoPin)) {
      setPinMensaje({ tipo: "error", texto: "El PIN debe tener exactamente 4 números." });
      return;
    }

    if (nuevoPin !== confirmarPin) {
      setPinMensaje({ tipo: "error", texto: "Los PINs no coinciden. Intenta de nuevo." });
      return;
    }

    setGuardandoPin(true);
    try {
      await configurarPIN(idUsuario, nuevoPin);
      setTienePin(true);
      setPinMensaje({ tipo: "ok", texto: "¡Tu PIN de 4 dígitos ha sido configurado! Ahora puedes iniciar sesión con él." });
      setNuevoPin("");
      setConfirmarPin("");
      setMostrarFormPin(false);
    } catch {
      setPinMensaje({ tipo: "error", texto: "No se pudo guardar el PIN. Intenta nuevamente." });
    } finally {
      setGuardandoPin(false);
    }
  }

  // Animación del anillo de tiempo circular
  const radio = 36;
  const circunferencia = 2 * Math.PI * radio;
  const strokeDashoffset = circunferencia - (segundosRestantes / 60) * circunferencia;
  const colorAlerta = segundosRestantes <= 10 ? "stroke-rose-500 text-rose-500" : segundosRestantes <= 25 ? "stroke-amber-500 text-amber-500" : "stroke-sky-500 text-sky-600";

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-14 font-sans text-slate-900">
      {/* ======================================================== */}
      {/* ENCABEZADO CON BADGE Y FOTICO DE SEGURIDAD BIOMÉTRICA    */}
      {/* ======================================================== */}
      {/* ======================================================== */}
      {/* ENCABEZADO CON BADGE Y FOTICO DE SEGURIDAD BIOMÉTRICA    */}
      {/* ======================================================== */}
      <div className="apple-glass-card rounded-[32px] p-6 sm:p-7 flex flex-wrap items-center justify-between gap-4 border border-white/95 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="apple-icon-badge h-14 w-14 rounded-2xl bg-gradient-to-tr from-amber-400 via-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25">
              <KeyRound size={26} />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white" />
            </span>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-extrabold uppercase tracking-wider">
              <Sparkles size={13} className="text-amber-500" />
              Token Criptográfico Activo
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              Clave Dinámica
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Protección continua estilo Nequi para autorizar tus movimientos
            </p>
          </div>
        </div>

        {/* Fotico / Avatar de Seguridad del Usuario */}
        <div className="flex items-center gap-3 bg-white/90 border border-slate-200/80 px-3.5 py-2 rounded-2xl shadow-xs">
          <div className="relative">
            <div className="apple-avatar-badge h-10 w-10 bg-gradient-to-tr from-amber-500 via-slate-800 to-slate-950 text-white font-black text-xs shadow-sm">
              {nombreUsuario.charAt(0).toUpperCase()}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
          </div>
          <div className="text-left text-xs">
            <p className="font-extrabold text-slate-950 leading-tight truncate max-w-[120px]">
              {nombreUsuario}
            </p>
            <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
              <ShieldCheck size={12} /> Cifrado 256-bit
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TARJETA PRINCIPAL: ANILLO CIRCULAR + DÍGITOS DINÁMICOS   */}
      {/* ======================================================== */}
      <div className="apple-glass-card rounded-[32px] p-7 sm:p-9 relative overflow-hidden text-center space-y-7 border border-white/95 shadow-xl">
        <div className="absolute inset-0 titanium-shimmer pointer-events-none opacity-40" />

        {/* Barra superior con anillo de cuenta regresiva y botón de refresco */}
        <div className="flex justify-between items-center relative z-10">
          <div className="flex items-center gap-2.5">
            {/* SVG Circular Countdown Ring */}
            <div className="relative w-11 h-11 flex items-center justify-center">
              <svg className="w-11 h-11 transform -rotate-90">
                <circle
                  cx="22"
                  cy="22"
                  r={radio}
                  stroke="#e2e8f0"
                  strokeWidth="3.5"
                  fill="transparent"
                />
                <circle
                  cx="22"
                  cy="22"
                  r={radio}
                  className={`${colorAlerta} transition-all duration-1000 ease-linear`}
                  strokeWidth="3.5"
                  strokeDasharray={circunferencia}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <span className={`absolute text-[11px] font-mono font-black ${colorAlerta}`}>
                {segundosRestantes}s
              </span>
            </div>

            <div className="text-left">
              <p className="text-xs font-black text-slate-950">Válida por {segundosRestantes} segundos</p>
              <p className="text-[10px] text-slate-400 font-medium">Se actualiza automáticamente</p>
            </div>
          </div>

          <button
            onClick={() => regenerar(true)}
            disabled={cargando}
            className="apple-glass-button px-3.5 py-2 rounded-2xl text-xs font-bold text-slate-700 hover:text-slate-950 flex items-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.97] shadow-sm disabled:opacity-40"
          >
            <RefreshCw size={14} className={cargando ? "animate-spin text-sky-600" : "text-slate-600"} />
            <span>Generar nueva</span>
          </button>
        </div>

        {errorClave && (
          <p className="relative z-10 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-2">
            No se pudo obtener tu clave dinámica: {errorClave}
          </p>
        )}

        {/* DÍGITOS DE LA CLAVE DINÁMICA CON ANIMACIÓN POP-IN */}
        <div className="py-2 relative z-10 space-y-4">
          <div className="inline-flex items-center justify-center gap-2.5 sm:gap-4 p-4 sm:p-5 rounded-[28px] bg-gradient-to-b from-slate-50/90 to-slate-100/70 border border-slate-200/90 shadow-inner">
            {(clave || "••••••").split("").map((digito, idx) => (
              <div
                key={idx}
                className="w-11 sm:w-14 h-16 sm:h-20 rounded-2xl bg-white border border-slate-200 text-3xl sm:text-4xl font-mono font-black text-slate-950 flex items-center justify-center shadow-md tracking-wider transition-all duration-200 hover:scale-105 select-none"
              >
                {cargando ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 animate-ping" />
                ) : (
                  digito
                )}
              </div>
            ))}
          </div>

          {/* Barra de progreso multicolor */}
          <div className="w-full max-w-sm mx-auto bg-slate-200/80 h-2 rounded-full overflow-hidden shadow-inner">
            <div
              className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                segundosRestantes <= 10
                  ? "bg-gradient-to-r from-rose-500 to-amber-500"
                  : "bg-gradient-to-r from-sky-500 to-emerald-400"
              }`}
              style={{ width: `${(segundosRestantes / 60) * 100}%` }}
            />
          </div>
        </div>

        {/* ACCIÓN PRINCIPAL: COPIAR CLAVE CON SPRING FEEDBACK */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10 pt-1">
          <button
            onClick={copiarClave}
            className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-[0.97] hover:scale-[1.02] shadow-lg ${
              copiado
                ? "bg-emerald-600 text-white shadow-emerald-600/25 scale-[1.02]"
                : "apple-primary-button shadow-sky-500/25"
            }`}
          >
            {copiado ? <Check size={18} className="text-white" /> : <Copy size={18} />}
            <span>{copiado ? "¡Clave copiada en portapapeles!" : "Copiar Clave Dinámica"}</span>
          </button>
        </div>

        {/* Banner informativo de seguridad */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 text-left flex items-start gap-3 relative z-10">
          <Info size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Tu clave de seguridad de 6 dígitos cambia cada 60 segundos y el servidor puede verificarla (no se envía por correo ni WhatsApp).
          </p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECCIÓN PIN DE 4 DÍGITOS (NEQUI STYLE)                  */}
      {/* ======================================================== */}
      <div className="apple-glass-card rounded-[32px] p-6 sm:p-8 space-y-6 border border-white/95 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shadow-sm">
              <Lock size={22} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">PIN de Entrada Rápida (4 Dígitos)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {tienePin
                  ? "Tienes un PIN activo. Puedes ingresar a BankLite con él sin usar contraseña larga."
                  : "Configura tu PIN de 4 números para entrar rápido como en Nequi."}
              </p>
            </div>
          </div>

          <button
            onClick={() => setMostrarFormPin(!mostrarFormPin)}
            className="apple-glass-button px-4 py-2.5 rounded-2xl text-xs font-black text-slate-800 hover:text-slate-950 transition-all duration-200 active:scale-[0.97] hover:scale-[1.02] shadow-sm"
          >
            {mostrarFormPin ? "Cancelar" : tienePin ? "Cambiar PIN" : "Configurar PIN"}
          </button>
        </div>

        {pinMensaje && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border animate-fade-in ${
              pinMensaje.tipo === "ok"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-rose-50 border-rose-200 text-rose-700"
            }`}
          >
            {pinMensaje.tipo === "ok" ? <Check size={16} /> : <Info size={16} />}
            {pinMensaje.texto}
          </div>
        )}

        {/* Formulario animado para configurar PIN */}
        {mostrarFormPin && (
          <form onSubmit={handleGuardarPIN} className="space-y-5 pt-3 border-t border-slate-200/80 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-600 mb-2">
                  Nuevo PIN (4 números)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  required
                  maxLength={4}
                  pattern="[0-9]{4}"
                  placeholder="••••"
                  value={nuevoPin}
                  onChange={(e) => setNuevoPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-3.5 text-center text-2xl font-mono tracking-[0.5em] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white shadow-sm transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-600 mb-2">
                  Confirma tu PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  required
                  maxLength={4}
                  pattern="[0-9]{4}"
                  placeholder="••••"
                  value={confirmarPin}
                  onChange={(e) => setConfirmarPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-3.5 text-center text-2xl font-mono tracking-[0.5em] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white shadow-sm transition"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={guardandoPin || nuevoPin.length !== 4 || confirmarPin.length !== 4}
                className="apple-primary-button disabled:opacity-40 font-extrabold px-7 py-3.5 rounded-2xl text-xs flex items-center gap-2 transition-all duration-200 active:scale-[0.97] hover:scale-[1.02] shadow-md shadow-sky-500/20"
              >
                {guardandoPin ? "Guardando..." : "Guardar mi PIN"}
                <ArrowRight size={15} />
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ======================================================== */}
      {/* CANALES DE SEGURIDAD ASOCIADOS CON ICONOS TEMÁTICOS      */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="apple-glass-card rounded-[28px] p-5 space-y-2 border border-slate-200/80 shadow-sm apple-spring">
          <div className="flex items-center gap-2.5 text-emerald-600 text-xs font-black uppercase tracking-wider">
            <div className="apple-icon-badge h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-xs">
              <Smartphone size={16} />
            </div>
            <span>WhatsApp Protegido</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Las confirmaciones 2FA y los comprobantes se envían de forma cifrada a tu número celular registrado mediante Green API.
          </p>
        </div>

        <div className="apple-glass-card rounded-[28px] p-5 space-y-2 border border-slate-200/80 shadow-sm apple-spring">
          <div className="flex items-center gap-2.5 text-sky-600 text-xs font-black uppercase tracking-wider">
            <div className="apple-icon-badge h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-xs">
              <ShieldCheck size={16} />
            </div>
            <span>Antifraude en Tiempo Real</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Tu cuenta cuenta con evaluación de riesgo instantánea en cada transacción, protegiendo tu saldo ante anomalías.
          </p>
        </div>
      </div>
    </div>
  );
}
