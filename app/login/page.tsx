"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Lock, UserPlus, ShieldCheck, Calendar, Phone, Sparkles, HeartHandshake } from "lucide-react";
import { Field } from "@/components/Field";
import { Banner } from "@/components/Banner";
import { ApiError, createUsuario, login as loginRequest } from "@/lib/api";
import { guardarSesion } from "@/lib/auth";

const PAISES = [
  { code: "CO", label: "🇨🇴 Colombia" },
  { code: "MX", label: "🇲🇽 México" },
  { code: "US", label: "🇺🇸 Estados Unidos" },
  { code: "ES", label: "🇪🇸 España" },
  { code: "PE", label: "🇵🇪 Perú" },
];

const SERVICIOS_BANCARIOS = [
  "Cuenta de Ahorros Digital",
  "Cuenta Corriente Empresarial",
  "Tarjeta de Crédito BankLite Gold",
  "Tarjeta Débito Contactless",
];

export default function LoginPage() {
  const router = useRouter();
  const [rolPortal, setRolPortal] = useState<"cliente" | "admin">("cliente");
  const [modo, setModo] = useState<"login" | "registro">("registro");
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
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  async function entrarConSesion(correo: string, clave: string) {
    const result = await loginRequest(correo, clave);
    guardarSesion(result.access_token, result.usuario);
    router.replace("/");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await entrarConSesion(email, password);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 401 ? "Email o contraseña incorrectos." : err.message);
      } else {
        setError("No se pudo conectar con identity-service. ¿Está corriendo?");
      }
    } finally {
      setCargando(false);
    }
  }

  async function handleRegistro(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
      });
      // Entra directo al sistema tras el registro
      await entrarConSesion(regEmail, regPassword);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 py-10 font-sans selection:bg-indigo-500/30">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6 sm:p-10 space-y-6 border border-indigo-100 animate-fade-in-up">
        
        {/* Cabecera Principal */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 animate-bounce-slow">
            <Building2 size={32} strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">BankLite</h1>
            <p className="text-sm text-indigo-600 font-bold tracking-wider uppercase mt-1 flex items-center justify-center gap-1">
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
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
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
        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-slate-700 text-sm flex items-start gap-3">
          <div className="p-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shrink-0 mt-0.5">
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
        {rolPortal === "cliente" && (
          <div className="grid grid-cols-2 gap-2 bg-slate-100 rounded-xl p-1 text-sm font-semibold">
            <button
              type="button"
              onClick={() => {
                setModo("registro");
                setError(null);
              }}
              className={`py-2 rounded-lg transition-colors ${
                modo === "registro" ? "bg-white text-indigo-700 shadow" : "text-slate-500"
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
                modo === "login" ? "bg-white text-indigo-700 shadow" : "text-slate-500"
              }`}
            >
              🔑 Ya tengo cuenta
            </button>
          </div>
        )}

        {error && <Banner kind="error" text={error} />}

        {/* Formulario de Inicio de Sesión (Cliente o Admin) */}
        {(modo === "login" || rolPortal === "admin") ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <Field label="Correo electrónico" hint="Tu correo personal registrado en el banco.">
              <input
                type="email"
                required
                autoFocus
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
              />
            </Field>
            <Field label="Contraseña" hint="Tu clave de acceso secreta.">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
              />
            </Field>
            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-60 text-white rounded-xl px-4 py-3.5 text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition transform active:scale-95"
            >
              <Lock size={20} />
              {cargando ? "Verificando acceso…" : "Ingresar al Banco"}
            </button>
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
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-base focus:border-indigo-600 focus:outline-none"
                />
              </Field>
              <Field label="Apellidos" hint="Tus apellidos.">
                <input
                  type="text"
                  placeholder="Ej: Rodríguez"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-base focus:border-indigo-600 focus:outline-none"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Fecha de Nacimiento" hint="Formulario accesible para mayores de edad.">
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={fechaNacimiento}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-base font-mono focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </Field>

              <Field label="País de Residencia">
                <select
                  value={paisResidencia}
                  onChange={(e) => setPaisResidencia(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-base focus:border-indigo-600 focus:outline-none bg-white"
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
              <div className="flex rounded-xl border-2 border-slate-200 overflow-hidden focus-within:border-indigo-600">
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

            <Field label="Servicio Bancario Solicitado" hint="Selecciona el producto que deseas solicitar.">
              <select
                value={servicioSolicitado}
                onChange={(e) => setServicioSolicitado(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-base font-semibold focus:border-indigo-600 focus:outline-none bg-white text-indigo-900"
              >
                {SERVICIOS_BANCARIOS.map((s) => (
                  <option key={s} value={s}>
                    💼 {s}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Correo electrónico" hint="Donde te enviaremos notificaciones de tu cuenta.">
              <input
                type="email"
                required
                placeholder="ejemplo@correo.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-base focus:border-indigo-600 focus:outline-none"
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
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-base focus:border-indigo-600 focus:outline-none"
              />
            </Field>

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-60 text-white rounded-xl px-4 py-3.5 text-base font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition transform active:scale-95"
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
