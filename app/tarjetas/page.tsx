"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { Banner } from "@/components/Banner";
import { StatusPill } from "@/components/StatusPill";
import { Field } from "@/components/Field";
import { FlowBanner } from "@/components/FlowBanner";
import { short } from "@/lib/format";
import {
  ApiError,
  Cuenta,
  Tarjeta,
  Autorizacion,
  Usuario,
  listAccounts,
  listCards,
  createCard,
  blockCard,
  unblockCard,
  authorizeCardTransaction,
  listCardAuthorizations,
  listAllAuthorizations,
  listUsuarios,
} from "@/lib/api";
import { CreditCard, Shield, Lock, Unlock, ShoppingCart, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";

type Feedback = { kind: "success" | "error"; text: string } | null;

export default function TarjetasPage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [autorizaciones, setAutorizaciones] = useState<Autorizacion[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [showFullNumber, setShowFullNumber] = useState<Record<string, boolean>>({});

  const toggleShowNumber = (cardId: string) => {
    setShowFullNumber((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  // Formulario Emisión
  const [selectedCuentaId, setSelectedCuentaId] = useState("");
  const [tipoTarjeta, setTipoTarjeta] = useState("virtual");
  const [procesador, setProcesador] = useState("Visa Direct");

  // Formulario Bloqueo
  const [bloqueoCardId, setBloqueoCardId] = useState("");
  const [motivoBloqueo, setMotivoBloqueo] = useState("");

  // Formulario Autorización
  const [authCardId, setAuthCardId] = useState("");
  const [authMonto, setAuthMonto] = useState("45.00");
  const [authComercio, setAuthComercio] = useState("Amazon Marketplace");

  async function refresh() {
    try {
      const [accs, crds, auths, usrs] = await Promise.all([
        listAccounts().catch(() => []),
        listCards().catch(() => []),
        listAllAuthorizations().catch(() => []),
        listUsuarios().catch(() => []),
      ]);
      setCuentas(accs);
      setTarjetas(crds);
      setAutorizaciones(auths);
      setUsuarios(usrs);
    } catch (err) {
      showError(err);
    }
  }

  // Resuelve nombre del dueño: tarjeta.id_cuenta → cuenta.id_usuario → usuario.nombre apellido
  function ownerName(idCuenta: string): string {
    const cuenta = cuentas.find((c) => c.id_cuenta === idCuenta);
    if (!cuenta) return "Sin cuenta";
    const usuario = usuarios.find((u) => u.id_usuario === cuenta.id_usuario);
    if (!usuario) return "Usuario desconocido";
    return `${usuario.nombre}${usuario.apellido ? " " + usuario.apellido : ""}`;
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
        text: `Error de conexión con card-service: ${err.message}. ¿Está corriendo en el puerto 8005?`,
      });
    } else {
      setFeedback({ kind: "error", text: "Ocurrió un error inesperado." });
    }
  }

  async function handleEmitirTarjeta(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!selectedCuentaId) {
      setFeedback({ kind: "error", text: "Debes seleccionar una cuenta bancaria." });
      return;
    }
    try {
      const card = await createCard({
        id_cuenta: selectedCuentaId,
        tipo_tarjeta: tipoTarjeta,
        procesador_externo: procesador,
        estado: "activa",
      });
      setFeedback({
        kind: "success",
        text: `Tarjeta ${card.tipo_tarjeta} emitida exitosamente (${short(card.id_tarjeta)}) vinculada a la cuenta ${short(card.id_cuenta)}.`,
      });
      await refresh();
    } catch (err) {
      showError(err);
    }
  }

  async function handleBloquearTarjeta(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!bloqueoCardId || !motivoBloqueo) {
      setFeedback({ kind: "error", text: "Selecciona una tarjeta e ingresa el motivo del bloqueo." });
      return;
    }
    try {
      await blockCard(bloqueoCardId, motivoBloqueo);
      setFeedback({
        kind: "success",
        text: `Tarjeta ${short(bloqueoCardId)} bloqueada. Motivo: "${motivoBloqueo}".`,
      });
      setMotivoBloqueo("");
      await refresh();
    } catch (err) {
      showError(err);
    }
  }

  async function handleDesbloquear(idTarjeta: string) {
    setFeedback(null);
    try {
      await unblockCard(idTarjeta);
      setFeedback({
        kind: "success",
        text: `Tarjeta ${short(idTarjeta)} reactivada exitosamente.`,
      });
      await refresh();
    } catch (err) {
      showError(err);
    }
  }

  async function handleAutorizar(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!authCardId) {
      setFeedback({ kind: "error", text: "Selecciona una tarjeta para la transacción." });
      return;
    }
    const montoNum = parseFloat(authMonto);
    if (isNaN(montoNum) || montoNum <= 0) {
      setFeedback({ kind: "error", text: "El monto debe ser mayor a 0." });
      return;
    }
    try {
      const res = await authorizeCardTransaction({
        id_tarjeta: authCardId,
        monto: montoNum,
        comercio: authComercio,
      });
      if (res.resultado === "aprobada") {
        setFeedback({
          kind: "success",
          text: `Transacción APROBADA: $${res.monto.toFixed(2)} en ${res.comercio}. Evento card.transaction.authorized emitido hacia Fraud Service.`,
        });
      } else {
        setFeedback({
          kind: "error",
          text: `Transacción RECHAZADA: La tarjeta seleccionada no está activa.`,
        });
      }
      await refresh();
    } catch (err) {
      showError(err);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <FlowBanner
        steps={[
          "1. Emitir tarjeta física o virtual asociándola a una cuenta abierta en account-service.",
          "2. Simular compras en comercios para autorizar o rechazar transacciones en tiempo real.",
          "3. Bloquear tarjetas por seguridad y verificar el cese de autorizaciones.",
        ]}
      />

      {feedback && <Banner kind={feedback.kind} text={feedback.text} />}

      {/* Grid Superior: Emisión y Autorización */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Emisión */}
        <Card title="Emitir Nueva Tarjeta" subtitle="Crear tarjeta física o virtual vinculada a una cuenta">
          <form onSubmit={handleEmitirTarjeta} className="space-y-4">
            <Field label="Cuenta Bancaria de Origen" hint="Se muestra el nombre del cliente dueño de la cuenta.">
              <select
                value={selectedCuentaId}
                onChange={(e) => setSelectedCuentaId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Selecciona una cuenta --</option>
                {cuentas.map((c) => (
                  <option key={c.id_cuenta} value={c.id_cuenta}>
                    {ownerName(c.id_cuenta)} — {c.moneda} ({c.estado})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Tipo de Tarjeta">
              <select
                value={tipoTarjeta}
                onChange={(e) => setTipoTarjeta(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm bg-white"
              >
                <option value="virtual">Virtual (Digital / App)</option>
                <option value="fisica">Física (Plástico / Contactless)</option>
              </select>
            </Field>

            <Field label="Procesador Externo">
              <select
                value={procesador}
                onChange={(e) => setProcesador(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm bg-white"
              >
                <option value="Visa Direct">Visa Direct</option>
                <option value="Mastercard Processing">Mastercard Processing</option>
                <option value="Marqeta Card Gateway">Marqeta Card Gateway</option>
              </select>
            </Field>

            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 transition"
            >
              Emitir Tarjeta
            </button>
          </form>
        </Card>

        {/* 2. Simulador de Autorizaciones */}
        <Card title="Simulador de Autorización" subtitle="Prueba de compra en comercios con emisión de eventos">
          <form onSubmit={handleAutorizar} className="space-y-4">
            <Field label="Tarjeta de Pago">
              <select
                value={authCardId}
                onChange={(e) => setAuthCardId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Selecciona tarjeta --</option>
                {tarjetas.map((t) => (
                  <option key={t.id_tarjeta} value={t.id_tarjeta}>
                    {short(t.id_tarjeta)} - {t.tipo_tarjeta} [{t.estado}]
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Comercio / Tienda">
              <input
                type="text"
                value={authComercio}
                onChange={(e) => setAuthComercio(e.target.value)}
                placeholder="Ej. Uber, Netflix, Amazon"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
              />
            </Field>

            <Field label="Monto de la Compra ($)">
              <input
                type="number"
                step="0.01"
                value={authMonto}
                onChange={(e) => setAuthMonto(e.target.value)}
                placeholder="Ej. 150.00"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm font-mono"
              />
            </Field>

            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 transition flex items-center justify-center gap-2"
            >
              <ShoppingCart size={16} /> Procesar Transacción
            </button>
          </form>
        </Card>

        {/* 3. Bloqueo de Seguridad */}
        <Card title="Control de Bloqueos" subtitle="Restricción o reactivación inmediata de tarjetas">
          <form onSubmit={handleBloquearTarjeta} className="space-y-4">
            <Field label="Tarjeta a Bloquear">
              <select
                value={bloqueoCardId}
                onChange={(e) => setBloqueoCardId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm bg-white"
              >
                <option value="">-- Selecciona tarjeta activa --</option>
                {tarjetas
                  .filter((t) => t.estado === "activa")
                  .map((t) => (
                    <option key={t.id_tarjeta} value={t.id_tarjeta}>
                      {ownerName(t.id_cuenta)} — {t.tipo_tarjeta} ({short(t.id_tarjeta)})
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Motivo de Seguridad">
              <input
                type="text"
                value={motivoBloqueo}
                onChange={(e) => setMotivoBloqueo(e.target.value)}
                placeholder="Ej. Sospecha de clonación / robo"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
              />
            </Field>

            <button
              type="submit"
              className="w-full rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-rose-700 transition flex items-center justify-center gap-2"
            >
              <Lock size={16} /> Bloquear Tarjeta
            </button>
          </form>
        </Card>
      </div>

      {/* Grid Tarjetas Visuales & Listado */}
      <Card title="Inventario de Tarjetas Emitidas" subtitle="Tarjetas registradas en base de datos independiente (3FN)">
        {tarjetas.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No hay tarjetas emitidas en el sistema aún.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tarjetas.map((t) => (
              <div
                key={t.id_tarjeta}
                className="relative p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl overflow-hidden border border-slate-700"
              >
                {/* Glow decorativo */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-2xl pointer-events-none"></div>

                <div className="flex justify-between items-center mb-6">
                  <span className="text-xs uppercase tracking-widest text-indigo-300 font-bold">BankLite {t.tipo_tarjeta}</span>
                  <StatusPill value={t.estado} />
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-8 rounded bg-amber-400/80 border border-amber-300/60 flex items-center justify-center text-[10px] text-slate-900 font-mono font-bold">
                      CHIP
                    </div>
                    <span className="text-xs text-slate-300 font-mono tracking-wider">
                      {showFullNumber[t.id_tarjeta]
                        ? `4532 ${t.id_tarjeta.replace(/-/g, "").slice(0, 4).toUpperCase()} ${t.id_tarjeta.replace(/-/g, "").slice(4, 8).toUpperCase()} ${t.id_tarjeta.slice(-4).toUpperCase()}`
                        : `•••• •••• •••• ${t.id_tarjeta.slice(-4).toUpperCase()}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleShowNumber(t.id_tarjeta)}
                    className="p-1 text-slate-400 hover:text-white transition rounded focus:outline-none"
                    title={showFullNumber[t.id_tarjeta] ? "Ocultar número" : "Ver número completo"}
                  >
                    {showFullNumber[t.id_tarjeta] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Nombre del titular */}
                <div className="mb-4">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">Titular</p>
                  <p className="text-sm font-semibold text-white tracking-wide truncate">
                    {ownerName(t.id_cuenta).toUpperCase()}
                  </p>
                </div>

                <div className="space-y-1 text-xs text-slate-300 border-t border-white/10 pt-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">ID Tarjeta:</span>
                    <span className="font-mono">{short(t.id_tarjeta)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cuenta:</span>
                    <span className="font-mono">{short(t.id_cuenta)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Procesador:</span>
                    <span>{t.procesador_externo}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 flex items-center justify-between border-t border-white/10">
                  <span className="text-[11px] text-slate-400">
                    {new Date(t.fecha_emision).toLocaleDateString()}
                  </span>
                  {t.estado === "bloqueada" && (
                    <button
                      onClick={() => handleDesbloquear(t.id_tarjeta)}
                      className="px-3 py-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 border border-emerald-500/30 transition"
                    >
                      <Unlock size={12} /> Reactivar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Historial de Autorizaciones */}
      <Card title="Historial de Autorizaciones de Compra" subtitle="Transacciones evaluadas y procesadas por Card Service">
        {autorizaciones.length === 0 ? (
          <div className="p-6 text-center text-slate-400">No hay transacciones registradas.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/80 text-xs text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">ID Autorización</th>
                  <th className="p-3">Titular</th>
                  <th className="p-3">Tarjeta</th>
                  <th className="p-3">Comercio</th>
                  <th className="p-3 text-right">Monto</th>
                  <th className="p-3 text-center">Resultado</th>
                  <th className="p-3">Fecha & Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {autorizaciones.map((a) => {
                  const tarjeta = tarjetas.find((t) => t.id_tarjeta === a.id_tarjeta);
                  return (
                  <tr key={a.id_autorizacion} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-mono text-xs text-indigo-600">{short(a.id_autorizacion)}</td>
                    <td className="p-3 font-medium text-slate-800">{tarjeta ? ownerName(tarjeta.id_cuenta) : "—"}</td>
                    <td className="p-3 font-mono text-xs">{short(a.id_tarjeta)}</td>
                    <td className="p-3 font-medium text-slate-800">{a.comercio}</td>
                    <td className="p-3 text-right font-mono font-semibold">${a.monto.toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <StatusPill value={a.resultado} />
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {new Date(a.fecha_hora).toLocaleString()}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
