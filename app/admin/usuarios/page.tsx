"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { Banner } from "@/components/Banner";
import { ApiError, Usuario, listUsuarios, reverificarUsuario } from "@/lib/api";
import { CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";

type Feedback = { kind: "success" | "error"; text: string } | null;

function EstadoPill({ estado, estado_kyc }: { estado: string; estado_kyc?: string | null }) {
  const kyc = estado_kyc || "";
  if (estado === "verificado")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
        <CheckCircle size={12} /> Verificado
      </span>
    );
  if (estado === "rechazado")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
        <XCircle size={12} /> Rechazado
      </span>
    );
  if (kyc === "VERIFICANDO")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 bg-brand-100 px-2 py-0.5 rounded-full animate-pulse">
        <Clock size={12} /> Verificando…
      </span>
    );
  if (kyc === "ERROR_VERIFICACION")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
        <AlertCircle size={12} /> Error verificación
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
      <Clock size={12} /> Pendiente
    </span>
  );
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function refresh() {
    try {
      const users = await listUsuarios();
      setUsuarios(users.filter((u) => u.role !== "admin"));
    } catch (err) {
      if (err instanceof ApiError) {
        setFeedback({ kind: "error", text: `(${err.status}) ${err.message}` });
      } else if (err instanceof Error) {
        setFeedback({ kind: "error", text: err.message });
      }
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onReverificar(id: string) {
    setFeedback(null);
    try {
      const u = await reverificarUsuario(id);
      setFeedback({
        kind: u.estado === "verificado" ? "success" : "error",
        text: `Resultado de la verificación: ${u.estado}`,
      });
      await refresh();
    } catch (err) {
      setFeedback({ kind: "error", text: err instanceof Error ? err.message : "No se pudo verificar." });
    }
  }

  const verificados = usuarios.filter((u) => u.estado === "verificado").length;
  const pendientes = usuarios.filter((u) => u.estado !== "verificado" && u.estado !== "rechazado").length;
  const rechazados = usuarios.filter((u) => u.estado === "rechazado").length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Info panel: la verificación es automática */}
      <div className="bg-brand-50 border border-brand-100 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <CheckCircle className="text-brand-500 flex-shrink-0 mt-0.5" size={22} />
          <div>
            <p className="font-bold text-brand-700 text-sm">Verificación automática activa</p>
            <p className="text-brand-700 text-sm mt-1">
              Cuando un usuario se registra y provee su cédula, el sistema invoca automáticamente
              el motor de verificación KYC (proveedor simulado en la demo). No se requiere aprobación manual
              del administrador.
            </p>
          </div>
        </div>
      </div>

      {feedback && <Banner kind={feedback.kind} text={feedback.text} />}

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-black text-green-700">{verificados}</p>
          <p className="text-sm text-green-600 font-semibold mt-1">Verificados</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-black text-amber-700">{pendientes}</p>
          <p className="text-sm text-amber-600 font-semibold mt-1">Pendientes</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-black text-red-700">{rechazados}</p>
          <p className="text-sm text-red-600 font-semibold mt-1">Rechazados</p>
        </div>
      </div>

      <Card title="Usuarios registrados (Clientes)" subtitle="La verificación KYC es automática al registro">
        <UsuariosTable usuarios={usuarios} onReverificar={onReverificar} />
      </Card>
    </div>
  );
}

function UsuariosTable({ usuarios, onReverificar }: { usuarios: Usuario[]; onReverificar: (id: string) => void }) {
  if (usuarios.length === 0)
    return (
      <p className="text-sm text-slate-400 text-center py-8">
        Aún no hay usuarios clientes registrados.
      </p>
    );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-400 border-b border-slate-100">
            <th className="py-2 pr-3">Nombre</th>
            <th className="py-2 pr-3">Email</th>
            <th className="py-2 pr-3">Cédula</th>
            <th className="py-2 pr-3">País</th>
            <th className="py-2 pr-3">Producto de interés</th>
            <th className="py-2 pr-3">Estado KYC</th>
            <th className="py-2 pr-3">Fecha registro</th>
            <th className="py-2 pr-3">Acción</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id_usuario} className="border-b border-slate-50 hover:bg-slate-50/80">
              <td className="py-2 pr-3 font-medium text-slate-800">
                {u.nombre} {u.apellido ?? ""}
              </td>
              <td className="py-2 pr-3 text-slate-500">{u.email}</td>
              <td className="py-2 pr-3 font-mono text-xs">{u.cedula || "—"}</td>
              <td className="py-2 pr-3">{u.pais_residencia}</td>
              <td className="py-2 pr-3 text-xs text-slate-600">{u.servicio_solicitado || "—"}</td>
              <td className="py-2 pr-3">
                <EstadoPill estado={u.estado} estado_kyc={u.estado_kyc} />
              </td>
              <td className="py-2 pr-3 text-xs text-slate-400">
                {new Date(u.fecha_registro).toLocaleDateString("es-CO")}
              </td>
              <td className="py-2 pr-3">
                {u.estado === "pendiente_verificacion" && u.cedula && (
                  <button
                    type="button"
                    onClick={() => onReverificar(u.id_usuario)}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 underline"
                  >
                    Verificar ahora
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
