"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Lock, ShieldCheck, Phone, ArrowRight, MessageSquare, Mail, RefreshCw, ChevronLeft, Eye, EyeOff, KeyRound } from "lucide-react";
import {
  ApiError,
  createUsuario,
  configurarPIN,
  solicitarReset,
  resetClave,
  solicitarCodigoLogin,
  confirmarCodigoLogin,
  loginConPIN,
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

function AppleInput({ type = "text", value, onChange, placeholder, autoFocus, required, disabled, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
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
        className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-3.5 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-all shadow-sm"
      />
      {isPassword && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow(!show)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 transition"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
    </div>
  );
}

function AppleLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-2">{children}</label>;
}

function AppleSelect({ value, onChange, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      value={value}
      onChange={onChange}
      {...rest}
      className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-3.5 text-[15px] text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white transition-all appearance-none shadow-sm"
    >
      {children}
    </select>
  );
}

function ErrorMsg({ text }: { text: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm font-semibold text-red-600 flex items-center gap-2">
      <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-red-500" />
      {text}
    </div>
  );
}

function SuccessMsg({ text }: { text: string }) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-sm font-semibold text-emerald-700 flex items-center gap-2">
      <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-emerald-500" />
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
      className="w-full apple-primary-button rounded-2xl px-4 py-3.5 text-[15px] font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 shadow-md shadow-sky-500/20 active:scale-[0.97]"
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
      className="w-full apple-glass-button rounded-2xl px-4 py-3.5 text-[15px] font-bold text-slate-700 hover:text-slate-950 flex items-center justify-center gap-2 transition-all disabled:opacity-40 active:scale-[0.97]"
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
  const [metodoLogin, setMetodoLogin] = useState<"pin" | "password">("pin");
  const [pin, setPin] = useState("");

  async function handleLoginPIN(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Ingresa tu número de celular, correo o cédula.");
      return;
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError("Ingresa los 4 números de tu PIN.");
      return;
    }
    setCargando(true);
    try {
      const result = await loginConPIN(email, pin);
      const usuarioRole = result.usuario.role;

      if (rolPortal === "admin" && usuarioRole !== "admin") {
        throw new Error("Esta cuenta no tiene permisos de administrador.");
      }
      if (rolPortal !== "admin" && usuarioRole === "admin") {
        throw new Error("Esta cuenta de administrador debe acceder por 'Administrador'.");
      }

      guardarSesion(result.access_token, result.usuario);
      router.replace(usuarioRole === "admin" ? "/admin" : "/cliente");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError("Celular/identificador o PIN incorrecto. Si aún no tienes un PIN, usa 'Contraseña' y configúralo en Clave Dinámica.");
        } else {
          setError(err.message);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al iniciar sesión con PIN.");
      }
    } finally {
      setCargando(false);
    }
  }

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
  const [regPin, setRegPin] = useState("");
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
    const cleanTel = telefonoLocal.replace(/\D/g, "");
    if (!cleanTel || cleanTel.length < 10) {
      setError("El número de teléfono celular es obligatorio y debe tener 10 dígitos (ej: 300 123 4567). Este número será tu cuenta bancaria y donde recibirás tus notificaciones de WhatsApp y SMS.");
      return;
    }
    if (regPin && (regPin.length !== 4 || !/^\d{4}$/.test(regPin))) {
      setError("El PIN debe ser exactamente 4 dígitos numéricos.");
      return;
    }
    if (esMenor && (!representanteNombre.trim() || representanteDocumento.length < 6 || representanteTelefono.length < 7)) {
      setError("Para menores de 18 años debes ingresar nombre, documento y teléfono del representante legal.");
      return;
    }
    setCargando(true);
    try {
      const nuevoUsuario = await createUsuario({
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
      // Configurar PIN si el usuario lo ingresó
      if (regPin && regPin.length === 4) {
        try {
          await configurarPIN(nuevoUsuario.id_usuario, regPin);
        } catch {
          // No bloquear el registro si falla el PIN — se puede configurar después
        }
      }
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
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 py-10 selection:bg-sky-500/20 text-slate-900 relative overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="apple-ambient-glow w-[550px] h-[400px] -top-20 -left-20 bg-sky-200/40" />
      <div className="apple-ambient-glow w-[550px] h-[400px] -bottom-20 -right-20 bg-emerald-200/35" />

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-400 text-white flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Building2 size={28} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">BankLite</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Banca Digital · Colombia</p>
          </div>
        </div>

        {/* Card */}
        <div className="apple-glass-card rounded-3xl p-6 sm:p-8 space-y-5 border border-white/95 shadow-xl">

          {/* Portal Selector */}
          <div className="flex gap-1.5 p-1 bg-slate-200/60 border border-slate-200/80 rounded-2xl">
            {(["cliente", "admin"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRolPortal(r)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all active:scale-[0.97] ${
                  rolPortal === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
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
                <div className="inline-flex p-3 rounded-2xl bg-sky-50 border border-sky-200/80 text-sky-600 shadow-sm">
                  <ShieldCheck size={28} />
                </div>
                <h2 className="text-lg font-extrabold text-slate-900">Verificación 2FA</h2>
                <p className="text-xs text-slate-500">
                  Hola <span className="text-slate-900 font-bold">{datos2FA.nombre}</span>, enviamos tu código a:
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5">
                  <MessageSquare size={14} className="text-emerald-500 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">WhatsApp</p>
                    <p className="text-xs font-mono font-bold text-slate-800">{datos2FA.telefono_enmascarado}</p>
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5">
                  <Mail size={14} className="text-sky-500 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email</p>
                    <p className="text-xs font-mono font-bold text-slate-800">{datos2FA.email_enmascarado}</p>
                  </div>
                </div>
              </div>

              {info2FA && <SuccessMsg text={info2FA} />}

              <div>
                <AppleLabel>Código de 6 dígitos</AppleLabel>
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
                  className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-4 text-center text-3xl font-black font-mono tracking-[0.5em] text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500 transition-all shadow-inner"
                />
              </div>

              <PrimaryBtn disabled={cargando || codigo2FA.length !== 6}>
                <Lock size={17} />
                {cargando ? "Verificando…" : "Confirmar e Ingresar"}
              </PrimaryBtn>

              <div className="flex items-center justify-between pt-1 text-xs">
                <button type="button" onClick={handleReenviar2FA} disabled={reenviando} className="text-slate-500 hover:text-slate-900 font-bold flex items-center gap-1 transition">
                  <RefreshCw size={13} className={reenviando ? "animate-spin" : ""} />
                  {reenviando ? "Reenviando…" : "Reenviar código"}
                </button>
                <button type="button" onClick={cancelar2FA} className="text-slate-500 hover:text-slate-900 font-bold flex items-center gap-1 transition">
                  <ChevronLeft size={13} /> Cambiar cuenta
                </button>
              </div>
            </form>

          ) : modo === "reset" ? (
            /* ── RESET ── */
            <div className="space-y-4">
              <button type="button" onClick={volverAlLogin} className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition">
                <ChevronLeft size={14} /> Volver al inicio de sesión
              </button>
              {resetOk ? (
                <div className="space-y-3">
                  <SuccessMsg text={resetOk} />
                  <GhostBtn onClick={volverAlLogin}>Ir al inicio de sesión</GhostBtn>
                </div>
              ) : resetPaso === 1 ? (
                <form onSubmit={handleSolicitarReset} className="space-y-4">
                  <h2 className="text-base font-extrabold text-slate-900">Recuperar contraseña</h2>
                  <div>
                    <AppleLabel>Correo electrónico</AppleLabel>
                    <AppleInput type="email" required autoFocus placeholder="ejemplo@correo.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                  </div>
                  <PrimaryBtn disabled={cargando}>{cargando ? "Enviando…" : "Enviar código"}</PrimaryBtn>
                </form>
              ) : (
                <form onSubmit={handleResetClave} className="space-y-4">
                  <h2 className="text-base font-extrabold text-slate-900">Nueva contraseña</h2>
                  {resetInfo && <SuccessMsg text={resetInfo} />}
                  <div>
                    <AppleLabel>Código de verificación (6 dígitos)</AppleLabel>
                    <AppleInput type="text" inputMode="numeric" required autoFocus minLength={6} maxLength={6} placeholder="123456" value={resetCodigo} onChange={(e) => setResetCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))} />
                  </div>
                  <div>
                    <AppleLabel>Nueva contraseña</AppleLabel>
                    <AppleInput type="password" required minLength={6} placeholder="••••••••" value={resetNueva} onChange={(e) => setResetNueva(e.target.value)} />
                  </div>
                  <div>
                    <AppleLabel>Confirmar contraseña</AppleLabel>
                    <AppleInput type="password" required minLength={6} placeholder="••••••••" value={resetConfirmar} onChange={(e) => setResetConfirmar(e.target.value)} />
                  </div>
                  <PrimaryBtn disabled={cargando}><Lock size={16} />{cargando ? "Restableciendo…" : "Restablecer contraseña"}</PrimaryBtn>
                </form>
              )}
            </div>

          ) : (modo === "login" || rolPortal === "admin") ? (
            /* ── LOGIN ── */
            <div className="space-y-4">
              {rolPortal === "cliente" && (
                <>
                  <div className="flex gap-1 p-1 bg-slate-200/60 border border-slate-200/80 rounded-2xl mb-1">
                    <button type="button" onClick={() => { setModo("registro"); setError(null); }} className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all active:scale-[0.97] ${modo === "registro" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
                      Crear cuenta
                    </button>
                    <button type="button" onClick={() => { setModo("login"); setError(null); }} className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all active:scale-[0.97] ${modo === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
                      Iniciar sesión
                    </button>
                  </div>

                  {/* Selector de Método: PIN Nequi vs Contraseña */}
                  <div className="flex gap-1.5 p-1 bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => { setMetodoLogin("pin"); setError(null); }}
                      className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] ${
                        metodoLogin === "pin" ? "bg-white text-slate-900 shadow-sm font-black" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <KeyRound size={13} className="text-sky-600" /> Entrar con PIN (4 dígitos)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMetodoLogin("password"); setError(null); }}
                      className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] ${
                        metodoLogin === "password" ? "bg-white text-slate-900 shadow-sm font-black" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Lock size={13} /> Contraseña
                    </button>
                  </div>
                </>
              )}

              {/* Login con PIN (Nequi Style) */}
              {rolPortal === "cliente" && metodoLogin === "pin" ? (
                <form onSubmit={handleLoginPIN} className="space-y-4 animate-fade-in">
                  <div>
                    <AppleLabel>Número de celular, correo o cédula</AppleLabel>
                    <AppleInput
                      type="text"
                      required
                      autoFocus
                      placeholder="Ej: 3104433445 o correo@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <AppleLabel>PIN de 4 dígitos</AppleLabel>
                    <input
                      type="password"
                      inputMode="numeric"
                      required
                      maxLength={4}
                      pattern="[0-9]{4}"
                      placeholder="••••"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-4 text-center text-3xl font-black font-mono tracking-[0.6em] text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500 transition-all shadow-inner"
                    />
                  </div>

                  <PrimaryBtn disabled={cargando || pin.length !== 4}>
                    <KeyRound size={17} />
                    {cargando ? "Verificando PIN…" : "Entrar con mi PIN"}
                  </PrimaryBtn>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => { setMetodoLogin("password"); setError(null); }}
                      className="text-xs text-slate-500 hover:text-slate-900 font-bold transition"
                    >
                      ¿No tienes PIN o lo olvidaste? Entra con contraseña
                    </button>
                  </div>
                </form>
              ) : (
                /* Login con Contraseña + 2FA */
                <form onSubmit={handleLogin} className="space-y-4 animate-fade-in">
                  <div>
                    <AppleLabel>Correo, teléfono o cédula</AppleLabel>
                    <AppleInput type="text" required autoFocus placeholder="ejemplo@correo.com o 3104433445" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <AppleLabel>Contraseña</AppleLabel>
                    <AppleInput type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>

                  {/* Phone registration optional */}
                  <div>
                    <button type="button" onClick={() => setMostrarCampoTelefono(!mostrarCampoTelefono)} className="text-xs text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 transition">
                      <Phone size={13} />
                      {mostrarCampoTelefono ? "Ocultar opción de WhatsApp" : "¿Sin WhatsApp registrado? Regístralo aquí"}
                    </button>
                    {mostrarCampoTelefono && (
                      <div className="mt-2">
                        <AppleLabel>Número de WhatsApp (+57...)</AppleLabel>
                        <AppleInput type="tel" placeholder="+573104433445" value={telefonoExtra} onChange={(e) => setTelefonoExtra(e.target.value)} />
                      </div>
                    )}
                  </div>

                  <PrimaryBtn disabled={cargando}>
                    {cargando ? "Enviando código…" : <>Ingresar con contraseña <ArrowRight size={16} /></>}
                  </PrimaryBtn>
                  <div className="text-center">
                    <button type="button" onClick={() => { setModo("reset"); setError(null); setResetPaso(1); setResetOk(null); setResetInfo(null); setResetEmail(email); }} className="text-xs text-slate-500 hover:text-slate-900 font-bold transition">
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                </form>
              )}
            </div>

          ) : (
            /* ── REGISTRO ── */
            <form onSubmit={handleRegistro} className="space-y-4">
              <div className="flex gap-1 p-1 bg-slate-200/60 border border-slate-200/80 rounded-2xl">
                <button type="button" onClick={() => { setModo("registro"); setError(null); }} className="flex-1 py-2 rounded-xl text-xs font-extrabold bg-white text-slate-900 shadow-sm transition">Crear cuenta</button>
                <button type="button" onClick={() => { setModo("login"); setError(null); }} className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 transition">Iniciar sesión</button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <AppleLabel>Nombre</AppleLabel>
                  <AppleInput type="text" required placeholder="María" value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </div>
                <div>
                  <AppleLabel>Apellidos</AppleLabel>
                  <AppleInput type="text" placeholder="Rodríguez" value={apellido} onChange={(e) => setApellido(e.target.value)} />
                </div>
              </div>

              <div>
                <AppleLabel>Fecha de nacimiento</AppleLabel>
                <AppleInput type="date" required value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} />
              </div>

              <div>
                <AppleLabel>Número de Celular (Obligatorio · Tu Cuenta BankLite)</AppleLabel>
                <div className="flex gap-2">
                  <select
                    value={telefonoPrefix}
                    onChange={(e) => setTelefonoPrefix(e.target.value)}
                    className="bg-slate-50 border border-slate-200/90 rounded-2xl px-3 py-3.5 text-sm text-slate-900 focus:outline-none appearance-none font-bold shadow-sm"
                  >
                    {PAISES.map((p) => <option key={p.code} value={PAIS_PREFIJOS[p.code]}>{p.label}</option>)}
                  </select>
                  <AppleInput
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="3001234567"
                    value={telefonoLocal}
                    onChange={(e) => setTelefonoLocal(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <p className="text-[11px] text-sky-700 font-bold mt-1.5 flex items-center gap-1">
                  <span>📱 Tu celular será tu número de cuenta bancaria y donde recibirás tus WhatsApp y SMS.</span>
                </p>
              </div>

              <div>
                <AppleLabel>Tipo de documento</AppleLabel>
                <AppleSelect value={tipoDocumento} onChange={(e) => { setTipoDocumento(e.target.value); setCedula(""); }}>
                  <option value="cedula">Cédula de ciudadanía</option>
                  <option value="tarjeta_identidad">Tarjeta de identidad</option>
                  <option value="cedula_extranjeria">Cédula de extranjería</option>
                  <option value="pasaporte">Pasaporte</option>
                </AppleSelect>
              </div>
              <div>
                <AppleLabel>Número de documento</AppleLabel>
                <AppleInput type="text" inputMode={tipoDocumento === "pasaporte" ? "text" : "numeric"} required minLength={6} maxLength={tipoDocumento === "pasaporte" ? 12 : 10} placeholder={tipoDocumento === "pasaporte" ? "AB123456" : "10101010"} value={cedula} onChange={(e) => setCedula(tipoDocumento === "pasaporte" ? e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 12) : e.target.value.replace(/\D/g, "").slice(0, 10))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <AppleLabel>País expedición</AppleLabel>
                  <AppleSelect value={paisExpedicion} onChange={(e) => setPaisExpedicion(e.target.value)}>
                    {PAISES.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
                  </AppleSelect>
                </div>
                <div>
                  <AppleLabel>País residencia</AppleLabel>
                  <AppleSelect value={paisResidencia} onChange={(e) => setPaisResidencia(e.target.value)}>
                    {PAISES.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
                  </AppleSelect>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <AppleLabel>Fecha expedición</AppleLabel>
                  <AppleInput type="date" required value={fechaExpedicion} onChange={(e) => setFechaExpedicion(e.target.value)} />
                </div>
                <div>
                  <AppleLabel>Fecha vencimiento</AppleLabel>
                  <AppleInput type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} />
                </div>
              </div>

              <div>
                <AppleLabel>Producto de interés</AppleLabel>
                <AppleSelect value={servicioSolicitado} onChange={(e) => setServicioSolicitado(e.target.value)}>
                  {SERVICIOS_BANCARIOS.map((s) => <option key={s} value={s}>{s}</option>)}
                </AppleSelect>
              </div>

              <div>
                <AppleLabel>Correo electrónico</AppleLabel>
                <AppleInput type="email" required placeholder="ejemplo@correo.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
              </div>
              <div>
                <AppleLabel>Contraseña</AppleLabel>
                <AppleInput type="password" required minLength={6} placeholder="Mínimo 6 caracteres" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
              </div>
              <div>
                <AppleLabel>PIN de 4 dígitos (para ingreso rápido)</AppleLabel>
                <AppleInput
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="\d{4}"
                  placeholder="Ej: 1234"
                  value={regPin}
                  onChange={(e) => setRegPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                />
                <p className="text-[11px] text-slate-400 mt-1 ml-1">Opcional. Te permite iniciar sesión más rápido, estilo Nequi.</p>
              </div>

              {esMenor && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Menor de 18 años — Representante legal</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <AppleLabel>Nombre del representante</AppleLabel>
                      <AppleInput type="text" required placeholder="Nombre completo" value={representanteNombre} onChange={(e) => setRepresentanteNombre(e.target.value)} />
                    </div>
                    <div>
                      <AppleLabel>Parentesco</AppleLabel>
                      <AppleSelect value={representanteParentesco} onChange={(e) => setRepresentanteParentesco(e.target.value)}>
                        <option value="madre">Madre</option>
                        <option value="padre">Padre</option>
                        <option value="tutor">Tutor legal</option>
                        <option value="otro">Otro</option>
                      </AppleSelect>
                    </div>
                    <div>
                      <AppleLabel>Tipo doc.</AppleLabel>
                      <AppleSelect value={representanteTipoDoc} onChange={(e) => setRepresentanteTipoDoc(e.target.value)}>
                        <option value="cedula">Cédula</option>
                        <option value="pasaporte">Pasaporte</option>
                        <option value="cedula_extranjeria">C. Extranjería</option>
                      </AppleSelect>
                    </div>
                    <div>
                      <AppleLabel>Documento</AppleLabel>
                      <AppleInput type="text" required minLength={6} placeholder="12345678" value={representanteDocumento} onChange={(e) => setRepresentanteDocumento(e.target.value)} />
                    </div>
                    <div>
                      <AppleLabel>Teléfono</AppleLabel>
                      <AppleInput type="tel" required placeholder="3001234567" value={representanteTelefono} onChange={(e) => setRepresentanteTelefono(e.target.value.replace(/\D/g, ""))} />
                    </div>
                    <div className="col-span-2">
                      <AppleLabel>Correo (opcional)</AppleLabel>
                      <AppleInput type="email" placeholder="correo@ejemplo.com" value={representanteEmail} onChange={(e) => setRepresentanteEmail(e.target.value)} />
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

        <p className="text-center text-[11px] text-slate-500 font-medium mt-6">
          Protegido por cifrado de extremo a extremo · BankLite © 2026
        </p>
      </div>
    </div>
  );
}
