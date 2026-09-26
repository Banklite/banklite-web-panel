"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { Banner } from "@/components/Banner";
import { Field } from "@/components/Field";
import { FlowBanner } from "@/components/FlowBanner";
import { ApiError, Usuario, listUsuarios, verificarKyc } from "@/lib/api";

const PAISES = ["CO", "MX", "US", "ES", "PE"];

type Feedback = { kind: "success" | "error"; text: string } | null;

export default function IdentidadPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [kycUsuarioId, setKycUsuarioId] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("cedula");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [paisEmision, setPaisEmision] = useState("CO");
  const [fechaExpiracion, setFechaExpiracion] = useState("2030-01-01");

  async function refresh() {
    try {
      const users = await listUsuarios();
      setUsuarios(users.filter(u => u.role !== "admin"));
    } catch (err) {
      showError(err);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function handleUserSelect(userId: string) {
    setKycUsuarioId(userId);
    const u = usuarios.find(x => x.id_usuario === userId);
    if (u) {
      setNumeroDocumento(u.cedula || "1029384756");
      setPaisEmision(u.pais_residencia || "CO");
    }
  }

  function showError(err: unknown) {
    if (err instanceof ApiError) {
      setFeedback({ kind: "error", text: `(${err.status}) ${err.message}` });
    } else if (err instanceof Error) {
      setFeedback({
        kind: "error",
        text: err.message,
      });
    }
  }

  async function handleKyc(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!kycUsuarioId) {
      setFeedback({ kind: "error", text: "Selecciona un usuario." });
      return;
    }
    try {
      const res = await verificarKyc({
        id_usuario: kycUsuarioId,
        tipo_documento: tipoDocumento as any,
        numero_documento: numeroDocumento,
        pais_emision: paisEmision,
        fecha_expiracion: fechaExpiracion,
      });
      setFeedback({
        kind: "success",
        text: `Verificación ${res.verificacion.resultado}. Evento identity.verified publicado.`,
      });
      await refresh();
    } catch (err) {
      showError(err);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <FlowBanner
        steps={[
          "1. El usuario se registra en la página principal.",
          "2. Verifica su KYC simulando la revisión de su cédula.",
        ]}
      />

      {feedback && <Banner kind={feedback.kind} text={feedback.text} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Verificación KYC" subtitle="POST /kyc/verify">
          <form onSubmit={handleKyc} className="space-y-3">
            <Field label="Usuario" hint="El usuario que se va a verificar.">
        <select
                 value={kycUsuarioId}
                 onChange={(e) => handleUserSelect(e.target.value)}
                 className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
               >
                 <option value="">Selecciona un usuario...</option>
                 {usuarios.map((u) => (
                   <option key={u.id_usuario} value={u.id_usuario}>
                     {u.nombre} - {u.email}
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
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono"
              />
            </Field>
            <div className="flex gap-2">
              <Field label="País de emisión">
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
              <Field label="Fecha de expiración">
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

      <Card title="Usuarios registrados (Clientes)" subtitle="GET /users">
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
             <th className="py-1 pr-2">Cédula</th>
             <th className="py-1 pr-2">Nombre</th>
             <th className="py-1 pr-2">Email</th>
           </tr>
        </thead>
        <tbody>
{usuarios.map((u) => (
             <tr key={u.id_usuario} className="border-b border-slate-50">
               <td className="py-1 pr-2 font-mono">{u.cedula || "N/A"}</td>
               <td className="py-1 pr-2">{u.nombre}</td>
               <td className="py-1 pr-2">{u.email}</td>
             </tr>
           ))}
        </tbody>
      </table>
    </div>
  );
}

