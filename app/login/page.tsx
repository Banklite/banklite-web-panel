"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Lock, UserPlus, ShieldCheck, Calendar, Phone, Sparkles, HeartHandshake } from "lucide-react";
import { Field } from "@/components/Field";
import { Banner } from "@/components/Banner";
import {
  ApiError,
  createUsuario,
  login as loginRequest,
  solicitarReset,
  resetClave,
  solicitarCodigoLogin,
  confirmarCodigoLogin,
  type LoginIniciarResponse,
} from "@/lib/api";
import { guardarSesion } from "@/lib/auth";

const PAISES = [
  { code: "CO", label: "🇨🇴 Colombia" },
  { code: "MX", label: "🇲🇽 México" },
  { code: "US", label: "🇺🇸 Estados Unidos" },
  { code: "ES", label: "🇪🇸 España" },
  { code: "PE", label: "🇵🇪 Perú" },
];

const SERVICIOS_BANCARIOS = [
  'Cuenta de Ahorros Digital', 'Cuenta de Ahorros Tradicional', 'Cuenta de Ahorros Infantil', 'Cuenta de Ahorros Pensional',
  'Cuenta Corriente Personal', 'Cuenta Corriente Empresarial', 'Cuenta Corriente Premium',
  'Tarjeta de Crédito BankLite Gold', 'Tarjeta de Crédito BankLite Platinum', 'Tarjeta Débito Contactless',
  'CDT (Certificado de Depósito a Término)', 'Microcrédito',
];

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rolPortal, setRolPortal] = useState<"cliente" | "admin">("cliente");
  const [modo, setModo] = useState<"login" | "registro" | "reset">(
    searchParams.get("modo") === "registro" ? "registro" : "login"
  );

  // Verificación 2FA con Código por WhatsApp y Correo
  const [paso2FA, setPaso2FA] = useState(false);
  const [datos2FA, setDatos2FA] = useState<LoginIniciarResponse | null>(null);
  const [codigo2FA, setCodigo2FA] = useState("");
  const [telefonoExtra, setTelefonoExtra] = useState("");
  const [mostrarCampoTelefono, setMostrarCampoTelefono] = useState(false);
  const [info2FA, setInfo2FA] = useState<string | null>(null);
  const [reenviando, setReenviando] = useState(false);

  // Recuperación de contraseña
  const [resetPaso, setResetPaso] = useState<1 | 2>(1);
  const [resetEmail, setResetEmail] = useState("");
  const [resetCodigo, setResetCodigo] = useState("");
  const [resetNueva, setResetNueva] = useState("");
  const [resetConfirmar, setResetConfirmar] = useState("");
  const [resetOk, setResetOk] = useState<string | null>(null);
  const [resetInfo, setResetInfo] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulario Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Formulario Registro Cliente
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("1985-06-15");
  const [telefonoPrefix, setTelefonoPrefix] = useState("+57");
  const [telefonoLocal, setTelefonoLocal] = useState("3001234567");
  const [paisResidencia, setPaisResidencia] = useState("CO");
  const [servicioSolicitado, setServicioSolicitado] = useState("Cuenta de Ahorros Digital");
  const [cedula, setCedula] = useState("");
  const [representanteNombre, setRepresentanteNombre] = useState("");
  const [representanteDocumento, setRepresentanteDocumento] = useState("");
  const [representanteTipoDoc, setRepresentanteTipoDoc] = useState("cedula");
  const [representanteParentesco, setRepresentanteParentesco] = useState("madre");
  const [representanteTelefono, setRepresentanteTelefono] = useState("");
  const [representanteEmail, setRepresentanteEmail] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("cedula");
  const [fechaExpedicion, setFechaExpedicion] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [paisExpedicion, setPaisExpedicion] = useState("CO");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

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
      // Paso 1: Enviar credenciales y disparar código a WhatsApp y Correo
      const res = await solicitarCodigoLogin(email, password, telefonoExtra.trim() || undefined);
      setDatos2FA(res);
      setPaso2FA(true);
      setInfo2FA(res.mensaje);
      if (res.codigo_debug) {
        setCodigo2FA(res.codigo_debug);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 401 ? "Correo/teléfono o contraseña incorrectos." : err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("No se pudo conectar con identity-service. ¿Está corriendo?");
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

      if (rolPortal === "admin" && usuarioRole !== "admin") {
        throw new Error("Estas credenciales no tienen permisos de administrador. Usa el Portal Clientes para acceder.");
      }

      if (rolPortal !== "admin" && usuarioRole === "admin") {
        throw new Error("Esta cuenta de administrador no puede acceder por el Portal Clientes. Cambia a 'Acceso Admin'.");
      }

      guardarSesion(result.access_token, result.usuario);
      if (usuarioRole === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/cliente");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 400 ? "Código de confirmación incorrecto o expirado." : err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al verificar el código de confirmación.");
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
      setInfo2FA("¡Nuevo código de confirmación enviado a tu WhatsApp y correo!");
      if (res.codigo_debug) setCodigo2FA(res.codigo_debug);
    } catch (err) {
      setError("No se pudo reenviar el código. Intenta nuevamente.");
    } finally {
      setReenviando(false);
    }
  }

  function cancelar2FA() {
    setPaso2FA(false);
    setDatos2FA(null);
    setCodigo2FA("");
    setInfo2FA(null);
    setError(null);
  }

  function volverAlLogin() {
    setModo("login");
    setPaso2FA(false);
    setDatos2FA(null);
    setCodigo2FA("");
    setInfo2FA(null);
    setError(null);
    setResetPaso(1);
    setResetCodigo("");
    setResetNueva("");
    setResetConfirmar("");
    setResetOk(null);
    setResetInfo(null);
  }

  async function handleSolicitarReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResetInfo(null);
    setCargando(true);
    try {
      const r = await solicitarReset(resetEmail);
      setResetInfo(r.codigo_debug ? `${r.mensaje} (código de prueba: ${r.codigo_debug})` : r.mensaje);
      setResetPaso(2);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo conectar con identity-service. ¿Está corriendo?");
    } finally {
      setCargando(false);
    }
  }

  async function handleResetClave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (resetNueva.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (resetNueva !== resetConfirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setCargando(true);
    try {
      const r = await resetClave(resetEmail, resetCodigo, resetNueva);
      setResetOk(r.mensaje || "Tu contraseña fue restablecida correctamente.");
      setResetInfo(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo conectar con identity-service. ¿Está corriendo?");
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
        nombre,
        apellido: apellido || undefined,
        email: regEmail,
        telefono: telefonoPrefix + telefonoLocal,
        pais_residencia: paisResidencia,
        password: regPassword,
        fecha_nacimiento: fechaNacimiento,
        servicio_solicitado: servicioSolicitado,
        cedula,
        tipo_documento: tipoDocumento,
        fecha_expedicion: fechaExpedicion,
        fecha_vencimiento: fechaVencimiento,
        pais_expedicion: paisExpedicion,
        ...(esMenor
          ? {
              representante_nombre: representanteNombre.trim(),
              representante_documento: representanteDocumento,
              representante_tipo_documento: representanteTipoDoc,
              representante_parentesco: representanteParentesco,
              representante_telefono: "+57" + representanteTelefono,
              ...(representanteEmail ? { representante_email: representanteEmail } : {}),
            }
          : {}),
      });

      // Disparar confirmación 2FA con código enviado a WhatsApp y Correo
      setEmail(regEmail);
      setPassword(regPassword);
      const res = await solicitarCodigoLogin(regEmail, regPassword);
      setDatos2FA(res);
      setPaso2FA(true);
      setModo("login");
      setInfo2FA("¡Cuenta creada exitosamente! Hemos enviado tu código de acceso a tu WhatsApp y a tu correo.");
      if (res.codigo_debug) setCodigo2FA(res.codigo_debug);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("No se pudo conectar con identity-service. ¿Está corriendo?");
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 via-slate-900 to-brand-900 px-4 py-10 font-sans selection:bg-brand-500/30">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6 sm:p-10 space-y-6 border border-brand-100 animate-fade-in-up">
        
        {/* Cabecera Principal */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-700 flex items-center justify-center text-white shadow-xl shadow-brand-600/30 animate-bounce-slow">
            <Building2 size={32} strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">BankLite</h1>
            <p className="text-sm text-brand-600 font-bold tracking-wider uppercase mt-1 flex items-center justify-center gap-1">
              <HeartHandshake size={16} /> Tu Banco Fácil & Seguro
            </p>
          </div>
        </div>

        {/* Selector de Portal: Cliente vs Administrador */}
        <div className="flex rounded-2xl bg-slate-100 p-1.5 gap-2 border border-slate-200">
          <button
            type="button"
            onClick={() => setRolPortal("cliente")}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              rolPortal === "cliente"
                ? "bg-brand-600 text-white shadow-lg shadow-brand-600/30"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles size={18} /> Portal Clientes
          </button>
          <button
            type="button"
            onClick={() => setRolPortal("admin")}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              rolPortal === "admin"
                ? "bg-slate-900 text-white shadow-lg shadow-slate-900/30"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldCheck size={18} /> Acceso Admin
          </button>
        </div>

        {/* Banner Explicativo Accesible */}
        <div className="p-4 rounded-2xl bg-brand-50 border border-brand-100 text-slate-700 text-sm flex items-start gap-3">
          <div className="p-2 rounded-xl bg-brand-600 text-white font-bold text-xs shrink-0 mt-0.5">
            ℹ️
          </div>
          <div>
            <p className="font-bold text-slate-900">
              {rolPortal === "cliente"
                ? "¡Bienvenido! Registra tus datos para solicitar tus servicios bancarios fácilmente."
                : "Módulo exclusivo para administradores y personal de operaciones de BankLite."}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Diseñado con texto grande y navegación clara para tu máxima comodidad.
            </p>
          </div>
        </div>

        {/* Sub-selector Iniciar sesión / Crear cuenta */}
        {rolPortal === "cliente" && modo !== "reset" && (
          <div className="grid grid-cols-2 gap-2 bg-slate-100 rounded-xl p-1 text-sm font-semibold">
            <button
              type="button"
              onClick={() => {
                setModo("registro");
                setError(null);
              }}
              className={`py-2 rounded-lg transition-colors ${
                modo === "registro" ? "bg-white text-brand-700 shadow" : "text-slate-500"
              }`}
            >
              📝 Registrarme gratis
            </button>
            <button
              type="button"
              onClick={() => {
                setModo("login");
                setError(null);
              }}
              className={`py-2 rounded-lg transition-colors ${
                modo === "login" ? "bg-white text-brand-700 shadow" : "text-slate-500"
              }`}
            >
              🔑 Ya tengo cuenta
            </button>
          </div>
        )}

        {error && <Banner kind="error" text={error} />}

        {/* Formulario de Inicio de Sesión (Cliente o Admin) */}
        {modo === "reset" ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={volverAlLogin}
              className="text-sm font-semibold text-brand-600 hover:text-brand-700 hover:underline"
            >
              ← Volver al login
            </button>

            {resetOk ? (
              <div className="space-y-3">
                <Banner kind="success" text={resetOk} />
                <button
                  type="button"
                  onClick={volverAlLogin}
                  className="text-sm font-bold text-brand-600 hover:text-brand-700 hover:underline"
                >
                  Volver al login
                </button>
              </div>
            ) : resetPaso === 1 ? (
              <form onSubmit={handleSolicitarReset} className="space-y-4">
                <Field label="Correo electrónico" hint="Te enviaremos un código de verificación.">
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="ejemplo@correo.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 transition"
                  />
                </Field>
                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-900 disabled:opacity-60 text-white rounded-xl px-4 py-3.5 text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-600/30 transition transform active:scale-95"
                >
                  {cargando ? "Enviando…" : "Enviar código"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetClave} className="space-y-4">
                <p className="text-sm font-bold text-slate-900">Ingresa el código de verificación</p>
                {resetInfo && <Banner kind="success" text={resetInfo} />}
                <Field label="Código de verificación" hint="6 dígitos enviados a tu correo.">
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    autoFocus
                    minLength={6}
                    maxLength={6}
                    pattern="[0-9]{6}"
                    placeholder="123456"
                    value={resetCodigo}
                    onChange={(e) => setResetCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base font-mono tracking-widest text-slate-900 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 transition"
                  />
                </Field>
                <Field label="Nueva contraseña" hint="Al menos 6 caracteres.">
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={resetNueva}
                    onChange={(e) => setResetNueva(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 transition"
                  />
                </Field>
                <Field label="Confirmar contraseña">
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={resetConfirmar}
                    onChange={(e) => setResetConfirmar(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 transition"
                  />
                </Field>
                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-900 disabled:opacity-60 text-white rounded-xl px-4 py-3.5 text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-600/30 transition transform active:scale-95"
                >
                  <Lock size={20} />
                  {cargando ? "Restableciendo…" : "Restablecer contraseña"}
                </button>
              </form>
            )}
          </div>
        ) : paso2FA && datos2FA ? (
          /* Paso 2FA: El usuario ingresa el código recibido en WhatsApp y Correo */
          <form onSubmit={handleConfirmar2FA} className="space-y-5 animate-fade-in">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-2xl bg-brand-50 border border-brand-200 text-brand-700">
                <ShieldCheck size={36} className="text-brand-600" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Confirmación de Seguridad (2FA)
              </h2>
              <p className="text-sm text-slate-600">
                Hola <strong className="text-brand-700">{datos2FA.nombre}</strong>, hemos enviado tu código de acceso a:
              </p>
            </div>

            {/* Tarjetas de canales WhatsApp y Correo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2.5">
                <span className="text-lg">💬</span>
                <div>
                  <p className="font-bold">WhatsApp</p>
                  <p className="font-mono text-emerald-700">{datos2FA.telefono_enmascarado}</p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center gap-2.5">
                <span className="text-lg">✉️</span>
                <div>
                  <p className="font-bold">Correo Electrónico</p>
                  <p className="font-mono text-blue-700">{datos2FA.email_enmascarado}</p>
                </div>
              </div>
            </div>

            {info2FA && <Banner kind="success" text={info2FA} />}

            <Field label="Código de Confirmación (6 dígitos)" hint="Ingresa los 6 números que recibiste en tu WhatsApp o en tu correo.">
              <input
                type="text"
                inputMode="numeric"
                required
                autoFocus
                minLength={6}
                maxLength={6}
                pattern="[0-9]{6}"
                placeholder="123456"
                value={codigo2FA}
                onChange={(e) => setCodigo2FA(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3.5 text-center text-3xl font-mono tracking-[0.4em] font-extrabold text-slate-900 focus:outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100 transition"
              />
            </Field>

            <button
              type="submit"
              disabled={cargando || codigo2FA.length !== 6}
              className="w-full bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 disabled:opacity-50 text-white rounded-xl px-4 py-3.5 text-base font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-brand-600/30 transition transform active:scale-95"
            >
              <Lock size={20} />
              {cargando ? "Verificando código…" : "Confirmar e Iniciar Sesión"}
            </button>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={handleReenviar2FA}
                disabled={reenviando}
                className="text-brand-600 hover:text-brand-700 font-bold hover:underline disabled:opacity-50"
              >
                {reenviando ? "Reenviando…" : "🔄 ¿No lo recibiste? Reenviar código"}
              </button>
              <button
                type="button"
                onClick={cancelar2FA}
                className="text-slate-500 hover:text-slate-700 font-medium hover:underline"
              >
                ← Cambiar usuario
              </button>
            </div>
          </form>
        ) : (modo === "login" || rolPortal === "admin") ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <Field label="Correo electrónico o Teléfono" hint="Tu correo personal o número registrado (ej: 3104433445 o ejemplo@correo.com).">
              <input
                type="text"
                required
                autoFocus
                placeholder="ejemplo@correo.com o 3104433445"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 transition"
              />
            </Field>
            <Field label="Contraseña" hint="Tu clave de acceso secreta.">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 transition"
              />
            </Field>

            {/* Opción para registrar o actualizar teléfono al iniciar sesión */}
            <div>
              <button
                type="button"
                onClick={() => setMostrarCampoTelefono(!mostrarCampoTelefono)}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <Phone size={14} />
                {mostrarCampoTelefono
                  ? "Ocultar registro de teléfono"
                  : "¿Quieres registrar o actualizar tu número de teléfono para recibir el WhatsApp?"}
              </button>
              {mostrarCampoTelefono && (
                <div className="mt-2 p-3 bg-brand-50/70 rounded-xl border border-brand-100 animate-fade-in">
                  <Field label="Número de WhatsApp a registrar" hint="Código de país + número (ej: +573104433445 o 3104433445)">
                    <input
                      type="tel"
                      placeholder="+573104433445"
                      value={telefonoExtra}
                      onChange={(e) => setTelefonoExtra(e.target.value)}
                      className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-brand-600 bg-white"
                    />
                  </Field>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 disabled:opacity-60 text-white rounded-xl px-4 py-3.5 text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-600/30 transition transform active:scale-95"
            >
              <Lock size={20} />
              {cargando ? "Enviando código de confirmación…" : "Ingresar al Banco"}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setModo("reset");
                  setError(null);
                  setResetPaso(1);
                  setResetOk(null);
                  setResetInfo(null);
                  setResetEmail(email);
                }}
                className="text-sm font-semibold text-brand-600 hover:text-brand-700 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </form>
        ) : (
          /* Formulario Completo de Registro para Clientes (Alta Accesibilidad) */
          <form onSubmit={handleRegistro} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Primer Nombre" hint="Tu nombre de pila.">
                <input
                  type="text"
                  required
                  placeholder="Ej: María"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-base focus:border-brand-600 focus:outline-none"
                />
              </Field>
              <Field label="Apellidos" hint="Tus apellidos.">
                <input
                  type="text"
                  placeholder="Ej: Rodríguez"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-base focus:border-brand-600 focus:outline-none"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Fecha de Nacimiento" hint="Si eres menor de 18 años se pedirán los datos de tu representante.">
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={fechaNacimiento}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-base font-mono focus:border-brand-600 focus:outline-none"
                  />
                </div>
              </Field>

              <Field label="País de Residencia">
                <select
                  value={paisResidencia}
                  onChange={(e) => setPaisResidencia(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-base focus:border-brand-600 focus:outline-none bg-white"
                >
                  {PAISES.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Teléfono de Contacto" hint="El código de país no se borra.">
              <div className="flex rounded-xl border-2 border-slate-200 overflow-hidden focus-within:border-brand-600">
                <select
                  value={telefonoPrefix}
                  onChange={(e) => setTelefonoPrefix(e.target.value)}
                  className="bg-slate-100 border-r border-slate-200 px-3 py-2.5 text-base font-bold font-mono text-slate-800 focus:outline-none"
                >
                  <option value="+57">🇨🇴 +57</option>
                  <option value="+52">🇲🇽 +52</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+34">🇪🇸 +34</option>
                  <option value="+51">🇵🇪 +51</option>
                </select>
                <input
                  type="tel"
                  required
                  placeholder="3001234567"
                  value={telefonoLocal}
                  onChange={(e) => setTelefonoLocal(e.target.value.replace(/\D/g, ""))}
                  className="flex-1 px-4 py-2.5 text-base font-mono focus:outline-none bg-white"
                />
              </div>
            </Field>

            <Field label="Producto de interés" hint="Solo informativo: un asesor lo usará para contactarte. Luego abres tu cuenta y tarjeta desde tu portal.">
              <select
                value={servicioSolicitado}
                onChange={(e) => setServicioSolicitado(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-base font-semibold focus:border-brand-600 focus:outline-none bg-white text-brand-900"
              >
                {SERVICIOS_BANCARIOS.map((s) => (
                  <option key={s} value={s}>
                    💼 {s}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Tipo de documento">
                <select
                  value={tipoDocumento}
                  onChange={(e) => { setTipoDocumento(e.target.value); setCedula(""); }}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-base focus:border-brand-600 focus:outline-none bg-white"
                >
                  <option value="cedula">Cédula de ciudadanía</option>
                  <option value="tarjeta_identidad">Tarjeta de identidad</option>
                  <option value="cedula_extranjeria">Cédula de extranjería</option>
                  <option value="pasaporte">Pasaporte</option>
                </select>
              </Field>
              <Field label="Número de Documento" hint={tipoDocumento === "pasaporte" ? "Letras y números, 6 a 12" : "Solo números, 6 a 10 dígitos"}>
                <input type="text" inputMode={tipoDocumento === "pasaporte" ? "text" : "numeric"} required minLength={6} maxLength={tipoDocumento === "pasaporte" ? 12 : 10} pattern={tipoDocumento === "pasaporte" ? "[A-Za-z0-9]{6,12}" : "[0-9]{6,10}"} title={tipoDocumento === "pasaporte" ? "Letras y números, entre 6 y 12" : "Solo números, entre 6 y 10 dígitos"} placeholder={tipoDocumento === "pasaporte" ? "Ej: AB123456" : "Ej: 10101010"} value={cedula} onChange={(e) => setCedula(tipoDocumento === "pasaporte" ? e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 12) : e.target.value.replace(/\D/g, "").slice(0, 10))} className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-base focus:border-brand-600 focus:outline-none" />
              </Field>
              <Field label="País Expedición">
                <select value={paisExpedicion} onChange={(e) => setPaisExpedicion(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-base focus:border-brand-600 focus:outline-none bg-white">
                  {PAISES.map((p) => (<option key={p.code} value={p.code}>{p.label}</option>))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Fecha Expedición">
                <input type="date" required value={fechaExpedicion} onChange={(e) => setFechaExpedicion(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-base focus:border-brand-600 focus:outline-none" />
              </Field>
              <Field label="Fecha Vencimiento">
                <input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-base focus:border-brand-600 focus:outline-none" />
              </Field>
            </div>

            {esMenor && (
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3">
                <p className="text-sm font-bold text-amber-800">
                  Eres menor de 18 años: se requieren los datos de tu representante legal (padre, madre o tutor).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Nombre del representante">
                    <input
                      type="text"
                      required
                      placeholder="Nombre completo"
                      value={representanteNombre}
                      onChange={(e) => setRepresentanteNombre(e.target.value)}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-base focus:border-brand-600 focus:outline-none bg-white"
                    />
                  </Field>
                  <Field label="Parentesco">
                    <select
                      value={representanteParentesco}
                      onChange={(e) => setRepresentanteParentesco(e.target.value)}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-base focus:border-brand-600 focus:outline-none bg-white"
                    >
                      <option value="madre">Madre</option>
                      <option value="padre">Padre</option>
                      <option value="tutor">Tutor legal</option>
                      <option value="otro">Otro</option>
                    </select>
                  </Field>
                  <Field label="Tipo de documento del representante">
                    <select
                      value={representanteTipoDoc}
                      onChange={(e) => setRepresentanteTipoDoc(e.target.value)}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-base focus:border-brand-600 focus:outline-none bg-white"
                    >
                      <option value="cedula">Cédula de ciudadanía</option>
                      <option value="cedula_extranjeria">Cédula de extranjería</option>
                    </select>
                  </Field>
                  <Field label="Teléfono del representante" hint="Solo números">
                    <input
                      type="tel"
                      inputMode="numeric"
                      required
                      minLength={7}
                      maxLength={10}
                      placeholder="3001234567"
                      value={representanteTelefono}
                      onChange={(e) => setRepresentanteTelefono(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-base focus:border-brand-600 focus:outline-none bg-white"
                    />
                  </Field>
                  <Field label="Correo del representante" hint="Opcional">
                    <input
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={representanteEmail}
                      onChange={(e) => setRepresentanteEmail(e.target.value)}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-base focus:border-brand-600 focus:outline-none bg-white"
                    />
                  </Field>
                  <Field label="Documento del representante" hint="Solo números, 6 a 10 dígitos">
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      minLength={6}
                      maxLength={10}
                      pattern="[0-9]{6,10}"
                      title="Solo números, entre 6 y 10 dígitos"
                      placeholder="Ej: 10101010"
                      value={representanteDocumento}
                      onChange={(e) => setRepresentanteDocumento(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-base focus:border-brand-600 focus:outline-none bg-white"
                    />
                  </Field>
                </div>
              </div>
            )}

            <Field label="Correo electrónico" hint="Donde te enviaremos notificaciones de tu cuenta.">
              <input
                type="email"
                required
                placeholder="ejemplo@correo.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-base focus:border-brand-600 focus:outline-none"
              />
            </Field>

            <Field label="Crear una Contraseña" hint="Al menos 6 caracteres.">
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-base focus:border-brand-600 focus:outline-none"
              />
            </Field>

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-900 disabled:opacity-60 text-white rounded-xl px-4 py-3.5 text-base font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-brand-600/30 transition transform active:scale-95"
            >
              <UserPlus size={20} />
              {cargando ? "Creando tu cuenta bancaria…" : "Completar Registro y Entrar"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}





