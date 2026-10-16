"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Lock, ShieldCheck, Phone, ArrowRight, MessageSquare, Mail, RefreshCw, ChevronLeft, Eye, EyeOff } from "lucide-react";
import {
  ApiError,
  createUsuario,
  solicitarReset,
  resetClave,
  solicitarCodigoLogin,
  confirmarCodigoLogin,
  type LoginIniciarResponse,
} from "@/lib/api";
import { guardarSesion } from "@/lib/auth";

const PAISES = [
  { code: "CO", label: "🇨🇴 +57" },
  { code: "MX", label: "🇲🇽 +52" },
  { code: "US", label: "🇺🇸 +1" },
  { code: "ES", label: "🇪🇸 +34" },
  { code: "PE", label: "🇵🇪 +51" },
];

const PAIS_PREFIJOS: Record<string, string> = { CO: "+57", MX: "+52", US: "+1", ES: "+34", PE: "+51" };

const SERVICIOS_BANCARIOS = [
  "Cuenta de Ahorros Digital", "Cuenta de Ahorros Tradicional", "Cuenta Corriente Personal",
  "Cuenta Corriente Empresarial", "Tarjeta de Crédito BankLite Gold", "Tarjeta de Crédito BankLite Platinum",
  "Tarjeta Débito Contactless", "CDT (Certificado de Depósito a Término)", "Microcrédito",
];

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function DarkInput({ type = "text", value, onChange, placeholder, autoFocus, required, disabled, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="relative">
      <input
        type={isPassword && show ? "text" : type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        required={required}
        disabled={disabled}
        {...rest}
        className="w-full bg-white/[0.06] border border-white/[0.12] rounded-2xl px-4 py-3.5 text-[15px] text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/30 focus:bg-white/[0.09] transition-all"
      />
      {isPassword && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow(!show)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
    </div>
  );
}

function DarkLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-2">{children}</label>;
}

function DarkSelect({ value, onChange, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      value={value}
      onChange={onChange}
      {...rest}
      className="w-full bg-white/[0.06] border border-white/[0.12] rounded-2xl px-4 py-3.5 text-[15px] text-white focus:outline-none focus:border-white/30 transition-all appearance-none"
    >
      {children}
    </select>
  );
}

function ErrorMsg({ text }: { text: string }) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-sm font-semibold text-red-400 flex items-center gap-2">
      <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-red-400" />
      {text}
    </div>
  );
}

function SuccessMsg({ text }: { text: string }) {
  return (
    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3 text-sm font-semibold text-emerald-400 flex items-center gap-2">
      <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-emerald-400" />
      {text}
    </div>
  );
}

function PrimaryBtn({ children, disabled, type = "submit", onClick }: { children: React.ReactNode; disabled?: boolean; type?: "submit" | "button"; onClick?: () => void }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="w-full bg-white hover:bg-neutral-100 disabled:opacity-40 text-black font-extrabold rounded-2xl px-4 py-3.5 text-[15px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xl shadow-white/10"
    >
      {children}
    </button>
  );
}

function GhostBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full border border-white/[0.12] hover:border-white/30 disabled:opacity-40 text-neutral-300 hover:text-white font-semibold rounded-2xl px-4 py-3.5 text-[15px] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
    >
      {children}
    </button>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rolPortal, setRolPortal] = useState<"cliente" | "admin">("cliente");
  const [modo, setModo] = useState<"login" | "registro" | "reset">(
    searchParams.get("modo") === "registro" ? "registro" : "login"
  );

  // 2FA
  const [paso2FA, setPaso2FA] = useState(false);
  const [datos2FA, setDatos2FA] = useState<LoginIniciarResponse | null>(null);
  const [codigo2FA, setCodigo2FA] = useState("");
  const [telefonoExtra, setTelefonoExtra] = useState("");
  const [mostrarCampoTelefono, setMostrarCampoTelefono] = useState(false);
  const [info2FA, setInfo2FA] = useState<string | null>(null);
  const [reenviando, setReenviando] = useState(false);

  // Reset
  const [resetPaso, setResetPaso] = useState<1 | 2>(1);
  const [resetEmail, setResetEmail] = useState("");
  const [resetCodigo, setResetCodigo] = useState("");
  const [resetNueva, setResetNueva] = useState("");
  const [resetConfirmar, setResetConfirmar] = useState("");
  const [resetOk, setResetOk] = useState<string | null>(null);
  const [resetInfo, setResetInfo] = useState<string | null>(null);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Registro
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [telefonoPrefix, setTelefonoPrefix] = useState("+57");
  const [telefonoLocal, setTelefonoLocal] = useState("");
  const [paisResidencia, setPaisResidencia] = useState("CO");
  const [servicioSolicitado, setServicioSolicitado] = useState("Cuenta de Ahorros Digital");
  const [cedula, setCedula] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("cedula");
  const [fechaExpedicion, setFechaExpedicion] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [paisExpedicion, setPaisExpedicion] = useState("CO");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [representanteNombre, setRepresentanteNombre] = useState("");
  const [representanteDocumento, setRepresentanteDocumento] = useState("");
  const [representanteTipoDoc, setRepresentanteTipoDoc] = useState("cedula");
  const [representanteParentesco, setRepresentanteParentesco] = useState("madre");
  const [representanteTelefono, setRepresentanteTelefono] = useState("");
  const [representanteEmail, setRepresentanteEmail] = useState("");

  const esMenor = (() => {
    if (!fechaNacimiento) return false;
    const fn = new Date(fechaNacimiento);
    if (isNaN(fn.getTime())) return false;
    const hoy = new Date();
    let edad = hoy.getFullYear() - fn.getFullYear();
    const m = hoy.getMonth() - fn.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < fn.getDate())) edad--;
    return edad < 18;
  })();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo2FA(null);
    setCargando(true);
    try {
      const res = await solicitarCodigoLogin(email, password, telefonoExtra.trim() || undefined);
      setDatos2FA(res);
      setPaso2FA(true);
      setInfo2FA(res.mensaje);
      if (res.codigo_debug) setCodigo2FA(res.codigo_debug);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 401 ? "Credenciales incorrectas. Verifica e intenta de nuevo." : err.message);
      } else {
        setError("No se pudo conectar con el servidor.");
      }
    } finally {
      setCargando(false);
    }
  }

  async function handleConfirmar2FA(e: React.FormEvent) {
    e.preventDefault();
    if (!datos2FA) return;
    setError(null);
    setCargando(true);
    try {
      const result = await confirmarCodigoLogin(datos2FA.id_usuario, codigo2FA);
      const usuarioRole = result.usuario.role;
      if (rolPortal === "admin" && usuarioRole !== "admin") throw new Error("Esta cuenta no tiene permisos de administrador.");
      if (rolPortal !== "admin" && usuarioRole === "admin") throw new Error("Esta cuenta de administrador debe acceder por 'Portal Admin'.");
      guardarSesion(result.access_token, result.usuario);
      router.replace(usuarioRole === "admin" ? "/admin" : "/cliente");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 400 ? "Código incorrecto o expirado." : err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al verificar el código.");
      }
    } finally {
      setCargando(false);
    }
  }

  async function handleReenviar2FA() {
    if (!email || !password) return;
    setError(null);
    setReenviando(true);
    try {
      const res = await solicitarCodigoLogin(email, password, telefonoExtra.trim() || undefined);
      setDatos2FA(res);
      setInfo2FA("Nuevo código enviado a tu WhatsApp y correo.");
      if (res.codigo_debug) setCodigo2FA(res.codigo_debug);
    } catch {
      setError("No se pudo reenviar el código.");
    } finally {
      setReenviando(false);
    }
  }

  function cancelar2FA() {
    setPaso2FA(false); setDatos2FA(null); setCodigo2FA(""); setInfo2FA(null); setError(null);
  }

  function volverAlLogin() {
    setModo("login"); setPaso2FA(false); setDatos2FA(null); setCodigo2FA(""); setInfo2FA(null);
    setError(null); setResetPaso(1); setResetCodigo(""); setResetNueva(""); setResetConfirmar(""); setResetOk(null); setResetInfo(null);
  }

  async function handleSolicitarReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setResetInfo(null); setCargando(true);
    try {
      const r = await solicitarReset(resetEmail);
      setResetInfo(r.codigo_debug ? `${r.mensaje} (código dev: ${r.codigo_debug})` : r.mensaje);
      setResetPaso(2);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo conectar.");
    } finally {
      setCargando(false);
    }
  }

  async function handleResetClave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (resetNueva.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }
    if (resetNueva !== resetConfirmar) { setError("Las contraseñas no coinciden."); return; }
    setCargando(true);
    try {
      const r = await resetClave(resetEmail, resetCodigo, resetNueva);
      setResetOk(r.mensaje || "Contraseña restablecida correctamente.");
      setResetInfo(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo restablecer la contraseña.");
    } finally {
      setCargando(false);
    }
  }

  async function handleRegistro(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (esMenor && (!representanteNombre.trim() || representanteDocumento.length < 6 || representanteTelefono.length < 7)) {
      setError("Para menores de 18 años debes ingresar nombre, documento y teléfono del representante legal.");
      return;
    }
    setCargando(true);
    try {
      await createUsuario({
        nombre, apellido: apellido || undefined, email: regEmail,
        telefono: telefonoPrefix + telefonoLocal, pais_residencia: paisResidencia,
        password: regPassword, fecha_nacimiento: fechaNacimiento, servicio_solicitado: servicioSolicitado,
        cedula, tipo_documento: tipoDocumento, fecha_expedicion: fechaExpedicion,
        fecha_vencimiento: fechaVencimiento, pais_expedicion: paisExpedicion,
        ...(esMenor ? {
          representante_nombre: representanteNombre.trim(), representante_documento: representanteDocumento,
          representante_tipo_documento: representanteTipoDoc, representante_parentesco: representanteParentesco,
          representante_telefono: "+57" + representanteTelefono,
          ...(representanteEmail ? { representante_email: representanteEmail } : {}),
        } : {}),
      });
      setEmail(regEmail);
      setPassword(regPassword);
      const res = await solicitarCodigoLogin(regEmail, regPassword);
      setDatos2FA(res);
      setPaso2FA(true);
      setModo("login");
      setInfo2FA("¡Cuenta creada! Hemos enviado tu código a tu WhatsApp y correo.");
      if (res.codigo_debug) setCodigo2FA(res.codigo_debug);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-10 selection:bg-white/20">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-96 w-96 bg-white/[0.03] rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center shadow-2xl shadow-white/20">
            <Building2 size={28} className="text-black" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight text-white">BankLite</h1>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mt-1">Banca Digital · Colombia</p>
          </div>
        </div>

        {/* Card */}
        <div className="apple-glass-card rounded-3xl p-6 sm:p-8 space-y-5">

          {/* Portal Selector */}
          <div className="flex gap-1.5 p-1 bg-white/[0.04] rounded-2xl">
            {(["cliente", "admin"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRolPortal(r)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  rolPortal === r ? "bg-white text-black shadow" : "text-neutral-400 hover:text-white"
                }`}
              >
                {r === "cliente" ? "Portal Clientes" : "Administrador"}
              </button>
            ))}
          </div>

          {error && <ErrorMsg text={error} />}

          {/* ── PASO 2FA ── */}
          {paso2FA && datos2FA ? (
            <form onSubmit={handleConfirmar2FA} className="space-y-5 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 rounded-2xl bg-white/[0.06] border border-white/10">
                  <ShieldCheck size={28} className="text-white" />
                </div>
                <h2 className="text-lg font-extrabold text-white">Verificación 2FA</h2>
                <p className="text-sm text-neutral-400">
                  Hola <span className="text-white font-bold">{datos2FA.nombre}</span>, enviamos tu código a:
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center gap-2.5">
                  <MessageSquare size={14} className="text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">WhatsApp</p>
                    <p className="text-xs font-mono text-white">{datos2FA.telefono_enmascarado}</p>
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center gap-2.5">
                  <Mail size={14} className="text-sky-400 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Email</p>
                    <p className="text-xs font-mono text-white">{datos2FA.email_enmascarado}</p>
                  </div>
                </div>
              </div>

              {info2FA && <SuccessMsg text={info2FA} />}

              <div>
                <DarkLabel>Código de 6 dígitos</DarkLabel>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  autoFocus
                  minLength={6}
                  maxLength={6}
                  pattern="[0-9]{6}"
                  placeholder="000000"
                  value={codigo2FA}
                  onChange={(e) => setCodigo2FA(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full bg-white/[0.06] border border-white/[0.12] rounded-2xl px-4 py-4 text-center text-3xl font-black font-mono tracking-[0.5em] text-white focus:outline-none focus:border-white/30 transition-all"
                />
              </div>

              <PrimaryBtn disabled={cargando || codigo2FA.length !== 6}>
                <Lock size={17} />
                {cargando ? "Verificando…" : "Confirmar e Ingresar"}
              </PrimaryBtn>

              <div className="flex items-center justify-between pt-1 text-xs">
                <button type="button" onClick={handleReenviar2FA} disabled={reenviando} className="text-neutral-400 hover:text-white font-semibold flex items-center gap-1 transition">
                  <RefreshCw size={13} className={reenviando ? "animate-spin" : ""} />
                  {reenviando ? "Reenviando…" : "Reenviar código"}
                </button>
                <button type="button" onClick={cancelar2FA} className="text-neutral-500 hover:text-neutral-300 font-semibold flex items-center gap-1 transition">
                  <ChevronLeft size={13} /> Cambiar cuenta
                </button>
              </div>
            </form>

          ) : modo === "reset" ? (
            /* ── RESET ── */
            <div className="space-y-4">
              <button type="button" onClick={volverAlLogin} className="text-xs font-semibold text-neutral-400 hover:text-white flex items-center gap-1 transition">
                <ChevronLeft size={14} /> Volver al inicio de sesión
              </button>
              {resetOk ? (
                <div className="space-y-3">
                  <SuccessMsg text={resetOk} />
                  <GhostBtn onClick={volverAlLogin}>Ir al inicio de sesión</GhostBtn>
                </div>
              ) : resetPaso === 1 ? (
                <form onSubmit={handleSolicitarReset} className="space-y-4">
                  <h2 className="text-base font-extrabold text-white">Recuperar contraseña</h2>
                  <div>
                    <DarkLabel>Correo electrónico</DarkLabel>
                    <DarkInput type="email" required autoFocus placeholder="ejemplo@correo.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                  </div>
                  <PrimaryBtn disabled={cargando}>{cargando ? "Enviando…" : "Enviar código"}</PrimaryBtn>
                </form>
              ) : (
                <form onSubmit={handleResetClave} className="space-y-4">
                  <h2 className="text-base font-extrabold text-white">Nueva contraseña</h2>
                  {resetInfo && <SuccessMsg text={resetInfo} />}
                  <div>
                    <DarkLabel>Código de verificación (6 dígitos)</DarkLabel>
                    <DarkInput type="text" inputMode="numeric" required autoFocus minLength={6} maxLength={6} placeholder="123456" value={resetCodigo} onChange={(e) => setResetCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))} />
                  </div>
                  <div>
                    <DarkLabel>Nueva contraseña</DarkLabel>
                    <DarkInput type="password" required minLength={6} placeholder="••••••••" value={resetNueva} onChange={(e) => setResetNueva(e.target.value)} />
                  </div>
                  <div>
                    <DarkLabel>Confirmar contraseña</DarkLabel>
                    <DarkInput type="password" required minLength={6} placeholder="••••••••" value={resetConfirmar} onChange={(e) => setResetConfirmar(e.target.value)} />
                  </div>
                  <PrimaryBtn disabled={cargando}><Lock size={16} />{cargando ? "Restableciendo…" : "Restablecer contraseña"}</PrimaryBtn>
                </form>
              )}
            </div>

          ) : (modo === "login" || rolPortal === "admin") ? (
            /* ── LOGIN ── */
            <form onSubmit={handleLogin} className="space-y-4">
              {rolPortal === "cliente" && (
                <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl mb-2">
                  <button type="button" onClick={() => { setModo("registro"); setError(null); }} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${modo === "registro" ? "bg-white/10 text-white" : "text-neutral-500 hover:text-neutral-300"}`}>
                    Crear cuenta
                  </button>
                  <button type="button" onClick={() => { setModo("login"); setError(null); }} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${modo === "login" ? "bg-white/10 text-white" : "text-neutral-500 hover:text-neutral-300"}`}>
                    Iniciar sesión
                  </button>
                </div>
              )}
              <div>
                <DarkLabel>Correo, teléfono o cédula</DarkLabel>
                <DarkInput type="text" required autoFocus placeholder="ejemplo@correo.com o 3104433445" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <DarkLabel>Contraseña</DarkLabel>
                <DarkInput type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>

              {/* Phone registration optional */}
              <div>
                <button type="button" onClick={() => setMostrarCampoTelefono(!mostrarCampoTelefono)} className="text-xs text-neutral-500 hover:text-neutral-300 flex items-center gap-1 transition">
                  <Phone size={13} />
                  {mostrarCampoTelefono ? "Ocultar opción de WhatsApp" : "¿Sin WhatsApp registrado? Regístralo aquí"}
                </button>
                {mostrarCampoTelefono && (
                  <div className="mt-2">
                    <DarkLabel>Número de WhatsApp (+57...)</DarkLabel>
                    <DarkInput type="tel" placeholder="+573104433445" value={telefonoExtra} onChange={(e) => setTelefonoExtra(e.target.value)} />
                  </div>
                )}
              </div>

              <PrimaryBtn disabled={cargando}>
                {cargando ? "Enviando código…" : <>Ingresar <ArrowRight size={16} /></>}
              </PrimaryBtn>
              <div className="text-center">
                <button type="button" onClick={() => { setModo("reset"); setError(null); setResetPaso(1); setResetOk(null); setResetInfo(null); setResetEmail(email); }} className="text-xs text-neutral-500 hover:text-neutral-300 font-semibold transition">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </form>

          ) : (
            /* ── REGISTRO ── */
            <form onSubmit={handleRegistro} className="space-y-4">
              <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl">
                <button type="button" onClick={() => { setModo("registro"); setError(null); }} className="flex-1 py-2 rounded-lg text-sm font-bold bg-white/10 text-white transition">Crear cuenta</button>
                <button type="button" onClick={() => { setModo("login"); setError(null); }} className="flex-1 py-2 rounded-lg text-sm font-bold text-neutral-500 hover:text-neutral-300 transition">Iniciar sesión</button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <DarkLabel>Nombre</DarkLabel>
                  <DarkInput type="text" required placeholder="María" value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </div>
                <div>
                  <DarkLabel>Apellidos</DarkLabel>
                  <DarkInput type="text" placeholder="Rodríguez" value={apellido} onChange={(e) => setApellido(e.target.value)} />
                </div>
              </div>

              <div>
                <DarkLabel>Fecha de nacimiento</DarkLabel>
                <DarkInput type="date" required value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} />
              </div>

              <div>
                <DarkLabel>Teléfono (WhatsApp)</DarkLabel>
                <div className="flex gap-2">
                  <select
                    value={telefonoPrefix}
                    onChange={(e) => setTelefonoPrefix(e.target.value)}
                    className="bg-white/[0.06] border border-white/[0.12] rounded-2xl px-3 py-3.5 text-sm text-white focus:outline-none appearance-none"
                  >
                    {PAISES.map((p) => <option key={p.code} value={PAIS_PREFIJOS[p.code]}>{p.label}</option>)}
                  </select>
                  <DarkInput type="tel" required placeholder="3001234567" value={telefonoLocal} onChange={(e) => setTelefonoLocal(e.target.value.replace(/\D/g, ""))} />
                </div>
              </div>

              <div>
                <DarkLabel>Tipo de documento</DarkLabel>
                <DarkSelect value={tipoDocumento} onChange={(e) => { setTipoDocumento(e.target.value); setCedula(""); }}>
                  <option value="cedula">Cédula de ciudadanía</option>
                  <option value="tarjeta_identidad">Tarjeta de identidad</option>
                  <option value="cedula_extranjeria">Cédula de extranjería</option>
                  <option value="pasaporte">Pasaporte</option>
                </DarkSelect>
              </div>
              <div>
                <DarkLabel>Número de documento</DarkLabel>
                <DarkInput type="text" inputMode={tipoDocumento === "pasaporte" ? "text" : "numeric"} required minLength={6} maxLength={tipoDocumento === "pasaporte" ? 12 : 10} placeholder={tipoDocumento === "pasaporte" ? "AB123456" : "10101010"} value={cedula} onChange={(e) => setCedula(tipoDocumento === "pasaporte" ? e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 12) : e.target.value.replace(/\D/g, "").slice(0, 10))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <DarkLabel>País expedición</DarkLabel>
                  <DarkSelect value={paisExpedicion} onChange={(e) => setPaisExpedicion(e.target.value)}>
                    {PAISES.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
                  </DarkSelect>
                </div>
                <div>
                  <DarkLabel>País residencia</DarkLabel>
                  <DarkSelect value={paisResidencia} onChange={(e) => setPaisResidencia(e.target.value)}>
                    {PAISES.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
                  </DarkSelect>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <DarkLabel>Fecha expedición</DarkLabel>
                  <DarkInput type="date" required value={fechaExpedicion} onChange={(e) => setFechaExpedicion(e.target.value)} />
                </div>
                <div>
                  <DarkLabel>Fecha vencimiento</DarkLabel>
                  <DarkInput type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} />
                </div>
              </div>

              <div>
                <DarkLabel>Producto de interés</DarkLabel>
                <DarkSelect value={servicioSolicitado} onChange={(e) => setServicioSolicitado(e.target.value)}>
                  {SERVICIOS_BANCARIOS.map((s) => <option key={s} value={s}>{s}</option>)}
                </DarkSelect>
              </div>

              <div>
                <DarkLabel>Correo electrónico</DarkLabel>
                <DarkInput type="email" required placeholder="ejemplo@correo.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
              </div>
              <div>
                <DarkLabel>Contraseña</DarkLabel>
                <DarkInput type="password" required minLength={6} placeholder="Mínimo 6 caracteres" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
              </div>

              {esMenor && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Menor de 18 años — Representante legal</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <DarkLabel>Nombre del representante</DarkLabel>
                      <DarkInput type="text" required placeholder="Nombre completo" value={representanteNombre} onChange={(e) => setRepresentanteNombre(e.target.value)} />
                    </div>
                    <div>
                      <DarkLabel>Parentesco</DarkLabel>
                      <DarkSelect value={representanteParentesco} onChange={(e) => setRepresentanteParentesco(e.target.value)}>
                        <option value="madre">Madre</option>
                        <option value="padre">Padre</option>
                        <option value="tutor">Tutor legal</option>
                        <option value="otro">Otro</option>
                      </DarkSelect>
                    </div>
                    <div>
                      <DarkLabel>Tipo doc.</DarkLabel>
                      <DarkSelect value={representanteTipoDoc} onChange={(e) => setRepresentanteTipoDoc(e.target.value)}>
                        <option value="cedula">Cédula</option>
                        <option value="pasaporte">Pasaporte</option>
                        <option value="cedula_extranjeria">C. Extranjería</option>
                      </DarkSelect>
                    </div>
                    <div>
                      <DarkLabel>Documento</DarkLabel>
                      <DarkInput type="text" required minLength={6} placeholder="12345678" value={representanteDocumento} onChange={(e) => setRepresentanteDocumento(e.target.value)} />
                    </div>
                    <div>
                      <DarkLabel>Teléfono</DarkLabel>
                      <DarkInput type="tel" required placeholder="3001234567" value={representanteTelefono} onChange={(e) => setRepresentanteTelefono(e.target.value.replace(/\D/g, ""))} />
                    </div>
                    <div className="col-span-2">
                      <DarkLabel>Correo (opcional)</DarkLabel>
                      <DarkInput type="email" placeholder="correo@ejemplo.com" value={representanteEmail} onChange={(e) => setRepresentanteEmail(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              <PrimaryBtn disabled={cargando}>
                {cargando ? "Creando cuenta…" : <>Registrarme <ArrowRight size={16} /></>}
              </PrimaryBtn>
            </form>
          )}
        </div>

        <p className="text-center text-[11px] text-neutral-600 mt-6">
          Protegido por cifrado de extremo a extremo · BankLite © 2026
        </p>
      </div>
    </div>
  );
}
