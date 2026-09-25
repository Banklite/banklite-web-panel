"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { Banner } from "@/components/Banner";
import { StatusPill } from "@/components/StatusPill";
import { Field } from "@/components/Field";
import { FlowBanner } from "@/components/FlowBanner";
import { ApiError, Usuario, createUsuario, listUsuarios, verificarKyc } from "@/lib/api";

const PAISES = ["CO", "MX", "US", "ES", "PE"];

type Feedback = { kind: "success" | "error"; text: string } | null;

export default function IdentidadPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [telefonoPrefix, setTelefonoPrefix] = useState("+57");
  const [telefonoLocal, setTelefonoLocal] = useState("3001234567");
  const [paisResidencia, setPaisResidencia] = useState("CO");

  const [kycUsuarioId, setKycUsuarioId] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("cedula");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [paisEmision, setPaisEmision] = useState("CO");
  const [fechaExpiracion, setFechaExpiracion] = useState("2030-01-01");

  async function refresh() {
    try {
      setUsuarios(await listUsuarios());
    } catch (err) {
      showError(err);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function showError(err: unknown) {
    if (err instanceof ApiError) {
      setFeedback({ kind: "error", text: `(${err.status}) ${err.message}` });
    } else if (err instanceof Error) {
      setFeedback({
        kind: "error",
        text: `No se pudo conectar con identity-service: ${err.message}. ¿Está corriendo con docker compose?`,
      });
    } else {
      setFeedback({ kind: "error", text: "Ocurrió un error inesperado." });
    }
  }

  async function handleCreateUsuario(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      const usuario = await createUsuario({
        nombre,
        apellido: apellido || undefined,
        email,
        telefono: telefonoPrefix + telefonoLocal,
        pais_residencia: paisResidencia,
      });
      setFeedback({ kind: "success", text: `Usuario creado en la tabla usuario: ${usuario.id_usuario}` });
      setNombre("");
      setApellido("");
      setEmail("");
      await refresh();
    } catch (err) {
      showError(err);
    }
  }

  async function handleKyc(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!kycUsuarioId) {
      setFeedback({ kind: "error", text: "Selecciona un usuario primero." });
      return;
    }
    try {
      const result = await verificarKyc({
        id_usuario: kycUsuarioId,
        tipo_documento: tipoDocumento,
        numero_documento: numeroDocumento,
        pais_emision: paisEmision,
        fecha_expiracion: fechaExpiracion,
      });
      const riesgo = result.verificacion.evaluaciones[0];
      setFeedback({
        kind: "success",
        text: `KYC ${result.verificacion.resultado} — usuario quedó "${result.estado_usuario}". Riesgo: ${riesgo?.nivel_riesgo} (score ${riesgo?.score}). Evento publicado: ${result.event_published ? "sí" : "no"}.`,
      });
      setNumeroDocumento("");
      await refresh();
    } catch (err) {
      showError(err);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Identidad & KYC</h2>
          <p className="text-slate-500 text-sm mt-1">
            Gestión de onboarding de clientes y perfiles de riesgo (identity-service)
          </p>
        </div>
      </div>

      {feedback && <Banner kind={feedback.kind} text={feedback.text} />}

      <FlowBanner
        steps={[
          "Registra un usuario con sus datos básicos (queda en estado \"pendiente_verificacion\").",
          "Verifica su identidad (KYC) con un número de documento — así pasa a \"verificado\".",
          "Con el usuario verificado, ya puedes abrirle una cuenta en la sección Cuentas.",
        ]}
      />

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Paso 1 — Registrar usuario" subtitle="POST /users">
          <form onSubmit={handleCreateUsuario} className="space-y-3">
            <Field label="Nombre" hint="Nombre de pila del cliente.">
              <input
                type="text"
                required
                placeholder="Ej: Juan"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
              />
            </Field>
            <Field label="Apellido" hint="Opcional.">
              <input
                type="text"
                placeholder="Ej: Rhenals"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
              />
            </Field>
            <Field label="Correo electrónico" hint="Debe ser único: no se puede repetir entre usuarios.">
              <input
                type="email"
                required
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
              />
            </Field>
            <Field label="Teléfono" hint="El prefijo de país no se puede eliminar, solo cambiar. Ingresa el número sin el código de país.">
              <div className="flex rounded-md border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-brand-600">
                {/* Prefijo: no se puede borrar, sí modificar */}
                <select
                  value={telefonoPrefix}
                  onChange={(e) => setTelefonoPrefix(e.target.value)}
                  className="bg-slate-100 border-r border-slate-300 px-2 py-2 text-sm font-mono text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="+57">🇨🇴 +57</option>
                  <option value="+52">🇲🇽 +52</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+34">🇪🇸 +34</option>
                  <option value="+51">🇵🇪 +51</option>
                </select>
                {/* Número local */}
                <input
                  type="tel"
                  required
                  placeholder="3001234567"
                  value={telefonoLocal}
                  onChange={(e) => setTelefonoLocal(e.target.value.replace(/\D/g, ""))}
                  className="flex-1 px-3 py-2 text-sm focus:outline-none bg-white font-mono"
                />
              </div>
            </Field>
            <Field label="País de residencia">
              <select
                value={paisResidencia}
                onChange={(e) => setPaisResidencia(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
              >
                {PAISES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <button
              type="submit"
              className="bg-brand-600 hover:bg-brand-700 text-white rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-600"
            >
              Crear usuario
            </button>
          </form>
        </Card>

        <Card title="Paso 2 — Verificación KYC" subtitle="POST /kyc/verify">
          <form onSubmit={handleKyc} className="space-y-3">
            <Field label="Usuario" hint="El usuario que se va a verificar.">
              <select
                value={kycUsuarioId}
                onChange={(e) => setKycUsuarioId(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Selecciona un usuario…</option>
                {usuarios.map((u) => (
                  <option key={u.id_usuario} value={u.id_usuario}>
                    {u.email} — {u.estado}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tipo de documento">
              <select
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="cedula">Cédula</option>
                <option value="pasaporte">Pasaporte</option>
                <option value="licencia">Licencia</option>
              </select>
            </Field>
            <Field
              label="Número de documento"
              hint="Truco de la simulación: si termina en 0000, la verificación se rechaza a propósito."
            >
              <input
                type="text"
                required
                placeholder="Ej: 1029384756"
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
            </Field>
            <div className="flex gap-2">
              <Field label="País de emisión" >
                <select
                  value={paisEmision}
                  onChange={(e) => setPaisEmision(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                >
                  {PAISES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Fecha de expiración" hint="Fecha en la que vence el documento (no la de expedición: ese dato no se captura en este sistema).">
                <input
                  type="date"
                  value={fechaExpiracion}
                  onChange={(e) => setFechaExpiracion(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                />
              </Field>
            </div>
            <button
              type="submit"
              className="bg-brand-600 hover:bg-brand-700 text-white rounded-md px-4 py-2 text-sm font-medium"
            >
              Enviar a verificación
            </button>
          </form>
        </Card>
      </div>

      <Card title="Usuarios registrados" subtitle="GET /users">
        <UsuariosTable usuarios={usuarios} />
      </Card>
    </div>
  );
}

function UsuariosTable({ usuarios }: { usuarios: Usuario[] }) {
  if (usuarios.length === 0) return <p className="text-sm text-slate-400">Aún no hay usuarios.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-400 border-b border-slate-100">
            <th className="py-1 pr-2">Email</th>
            <th className="py-1 pr-2">País</th>
            <th className="py-1 pr-2">Estado</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id_usuario} className="border-b border-slate-50">
              <td className="py-1 pr-2">{u.email}</td>
              <td className="py-1 pr-2">{u.pais_residencia}</td>
              <td className="py-1 pr-2">
                <StatusPill value={u.estado} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
