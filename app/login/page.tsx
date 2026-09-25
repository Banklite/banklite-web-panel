"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Lock, UserPlus } from "lucide-react";
import { Field } from "@/components/Field";
import { Banner } from "@/components/Banner";
import { ApiError, createUsuario, login as loginRequest } from "@/lib/api";
import { guardarSesion } from "@/lib/auth";

const PAISES = ["CO", "MX", "US", "ES", "PE"];

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Registro (autoservicio — crea el usuario y lo deja logueado de una vez)
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [telefono, setTelefono] = useState("+573001234567");
  const [paisResidencia, setPaisResidencia] = useState("CO");
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
        telefono,
        pais_residencia: paisResidencia,
        password: regPassword,
      });
      // Cuenta creada — entra directo, sin pedirle que lo escriba dos veces.
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
    <div className="min-h-screen flex items-center justify-center bg-corporate-gradient px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 space-y-6 animate-fade-in-up">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/40">
            <Building2 size={28} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">BankLite</h1>
            <p className="text-xs text-slate-500 uppercase tracking-[0.2em] font-bold mt-1">Core Banking</p>
          </div>
        </div>

        {/* Selector Iniciar sesión / Crear cuenta */}
        <div className="grid grid-cols-2 gap-1 bg-slate-100 rounded-lg p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => {
              setModo("login");
              setError(null);
            }}
            className={`py-1.5 rounded-md transition-colors ${
              modo === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setModo("registro");
              setError(null);
            }}
            className={`py-1.5 rounded-md transition-colors ${
              modo === "registro" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            Crear cuenta
          </button>
        </div>

        {error && <Banner kind="error" text={error} />}

        {modo === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <Field label="Correo electrónico">
              <input
                type="email"
                required
                autoFocus
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
              />
            </Field>
            <Field label="Contraseña">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
              />
            </Field>
            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-md px-4 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Lock size={16} />
              {cargando ? "Verificando…" : "Iniciar sesión"}
            </button>
            <p className="text-xs text-center text-slate-400">
              ¿No tienes cuenta? Usa la pestaña &quot;Crear cuenta&quot; arriba.
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegistro} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Nombre">
                <input
                  type="text"
                  required
                  placeholder="Juan"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Apellido">
                <input
                  type="text"
                  placeholder="Rhenals"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                />
              </Field>
            </div>
            <Field label="Correo electrónico">
              <input
                type="email"
                required
                placeholder="correo@ejemplo.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Teléfono">
                <input
                  type="text"
                  required
                  placeholder="+573001234567"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                />
              </Field>
              <Field label="País">
                <select
                  value={paisResidencia}
                  onChange={(e) => setPaisResidencia(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                >
                  {PAISES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Contraseña" hint="Mínimo 6 caracteres.">
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
            </Field>
            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-md px-4 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <UserPlus size={16} />
              {cargando ? "Creando cuenta…" : "Crear cuenta y entrar"}
            </button>
            <p className="text-xs text-center text-slate-400">
              Al crear la cuenta queda en estado &quot;pendiente_verificacion&quot; hasta completar el KYC dentro del panel.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
