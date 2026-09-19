"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { Banner } from "@/components/Banner";
import { StatusPill } from "@/components/StatusPill";
import { ApiError, Usuario, createUsuario, listUsuarios, verificarKyc } from "@/lib/api";

const PAISES = ["CO", "MX", "US", "ES", "PE"];

type Feedback = { kind: "success" | "error"; text: string } | null;

export default function IdentidadPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("+573001234567");
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
        telefono,
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800">Identidad y KYC</h2>
        <p className="text-slate-500 text-sm mt-1">
          identity-service · puerto 8001 · tablas usuario, documento_identidad, verificacion_kyc, evaluacion_riesgo
        </p>
      </div>

      {feedback && <Banner kind={feedback.kind} text={feedback.text} />}

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Registrar usuario" subtitle="POST /users">
          <form onSubmit={handleCreateUsuario} className="space-y-3">
            <input
              type="text"
              required
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Apellido (opcional)"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            />
            <input
              type="email"
              required
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            />
            <input
              type="text"
              required
              placeholder="+573001234567"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            />
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
            <button
              type="submit"
              className="bg-brand-600 hover:bg-brand-700 text-white rounded-md px-4 py-2 text-sm font-medium"
            >
              Crear usuario
            </button>
          </form>
        </Card>

        <Card title="Verificación KYC" subtitle="POST /kyc/verify">
          <form onSubmit={handleKyc} className="space-y-3">
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
            <select
              value={tipoDocumento}
              onChange={(e) => setTipoDocumento(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="cedula">Cédula</option>
              <option value="pasaporte">Pasaporte</option>
              <option value="licencia">Licencia</option>
            </select>
            <input
              type="text"
              required
              placeholder="Número de documento"
              value={numeroDocumento}
              onChange={(e) => setNumeroDocumento(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <select
                value={paisEmision}
                onChange={(e) => setPaisEmision(e.target.value)}
                className="w-1/2 border border-slate-300 rounded-md px-3 py-2 text-sm"
              >
                {PAISES.map((p) => (
                  <option key={p} value={p}>
                    {p} (emisión)
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={fechaExpiracion}
                onChange={(e) => setFechaExpiracion(e.target.value)}
                className="w-1/2 border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <p className="text-xs text-slate-400">
              Truco de la simulación: un número que termine en 0000 se rechaza.
            </p>
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
