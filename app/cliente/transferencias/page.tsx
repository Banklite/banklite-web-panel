"use client";
import { useEffect, useState } from "react";
import { obtenerSesion } from "@/lib/auth";
import {
  listAccounts, listBeneficiaries, listRails, createBeneficiary, createTransfer,
  getLedgerBalance, Cuenta, Beneficiario, RielPago, CuentaContable,
} from "@/lib/api";
import {
  ArrowRightLeft, CheckCircle, AlertCircle, Plus, Send,
  ChevronRight, ChevronLeft, Loader2, RefreshCw,
} from "lucide-react";

// ID del riel interno predeterminado (seed fijo en transfer-service)
const RIEL_INTERNO_ID = "00000000-0000-0000-0000-000000000101";

type Paso = "elegir_cuenta" | "elegir_beneficiario" | "detalles" | "confirmar" | "procesando" | "exito" | "error_final";

function formatCOP(v: string | number | null | undefined) {
  if (v == null) return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);
}

function maskNumeroCuenta(nc: string | null | undefined) {
  if (!nc) return "••••••••";
  return "****" + nc.slice(-4);
}

export default function ClienteTransferenciasPage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [rieles, setRieles] = useState<RielPago[]>([]);
  const [ledgers, setLedgers] = useState<Record<string, CuentaContable | null>>({});

  const [paso, setPaso] = useState<Paso>("elegir_cuenta");

  const [cuentaOrigen, setCuentaOrigen] = useState("");
  const [beneficiario, setBeneficiario] = useState("");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");

  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaCuentaDest, setNuevaCuentaDest] = useState("");
  const [agregarModo, setAgregarModo] = useState(false);

  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ monto: string; beneficiario: string; referencia: string; fecha: string } | null>(null);

  useEffect(() => {
    const sesion = obtenerSesion();
    async function cargar() {
      try {
        const [todasCuentas, b, r] = await Promise.all([
          listAccounts(),
          listBeneficiaries(),
          listRails().catch(() => [] as RielPago[]),
        ]);
        const misCuentas = todasCuentas.filter(
          (c) => c.id_usuario === sesion?.usuario.id_usuario && c.estado === "activa"
        );
        setCuentas(misCuentas);
        setBeneficiarios(b.filter((be) => be.id_usuario === sesion?.usuario.id_usuario));
        setRieles(r);

        // Pre-cargar saldos de las cuentas
        const ledgerMap: Record<string, CuentaContable | null> = {};
        await Promise.all(
          misCuentas.map(async (c) => {
            try {
              ledgerMap[c.id_cuenta] = await getLedgerBalance(c.id_cuenta);
            } catch {
              ledgerMap[c.id_cuenta] = null;
            }
          })
        );
        setLedgers(ledgerMap);
      } catch {
        setError("No pudimos cargar su información. Intente nuevamente.");
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  function getRielInternoId(): string {
    // Primero busca en la respuesta de la API
    const rielApi = rieles.find((r) => r.tipo === "interno" && r.activo);
    if (rielApi) return rielApi.id_riel;
    // Si no, usa el ID semilla conocido
    return RIEL_INTERNO_ID;
  }

  async function handleAgregarBeneficiario() {
    if (!nuevoNombre || !nuevaCuentaDest) return setError("Complete el nombre y la cuenta del destinatario.");
    const sesion = obtenerSesion();
    setError(null);
    try {
      await createBeneficiary({
        id_usuario: sesion!.usuario.id_usuario,
        nombre: nuevoNombre,
        cuenta_destino: nuevaCuentaDest,
        banco_destino: "BankLite",
      });
      const b = await listBeneficiaries();
      setBeneficiarios(b.filter((be) => be.id_usuario === sesion?.usuario.id_usuario));
      setNuevoNombre("");
      setNuevaCuentaDest("");
      setAgregarModo(false);
    } catch {
      setError("No se pudo agregar el destinatario. Intente de nuevo.");
    }
  }

  async function handleTransferir() {
    setEnviando(true);
    setPaso("procesando");
    setError(null);
    const idRiel = getRielInternoId();
    try {
      const res = await createTransfer({
        id_cuenta_origen: cuentaOrigen,
        id_beneficiario: beneficiario,
        id_riel: idRiel,
        monto,
        concepto,
        idempotency_key: crypto.randomUUID(),
      });
      const benefNombre = beneficiarios.find((b) => b.id_beneficiario === beneficiario)?.nombre ?? "destinatario";
      const fechaHora = new Date().toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" });
      setResultado({
        monto: formatCOP(monto),
        beneficiario: benefNombre,
        referencia: res.transferencia.referencia ?? "BL-" + Date.now(),
        fecha: fechaHora,
      });
      setPaso("exito");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg);
      setPaso("error_final");
    } finally {
      setEnviando(false);
    }
  }

  function reiniciar() {
    setPaso("elegir_cuenta");
    setMonto("");
    setConcepto("");
    setBeneficiario("");
    setCuentaOrigen("");
    setError(null);
    setResultado(null);
  }

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 size={48} className="text-indigo-500 animate-spin" />
        <p className="text-xl text-slate-500 font-semibold">Cargando su información…</p>
      </div>
    );

  const benefSelect = beneficiarios.find((b) => b.id_beneficiario === beneficiario);
  const cuentaSelect = cuentas.find((c) => c.id_cuenta === cuentaOrigen);

  // Barra de progreso
  const pasoIndex = ["elegir_cuenta", "elegir_beneficiario", "detalles", "confirmar"].indexOf(paso);
  const pasos = ["1. Cuenta", "2. Destinatario", "3. Detalles", "4. Confirmar"];

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      {/* Encabezado */}
      <div className="flex items-center gap-4">
        <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600">
          <ArrowRightLeft size={28} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800">Transferir Dinero</h1>
          <p className="text-lg text-slate-500">Proceso seguro y paso a paso.</p>
        </div>
      </div>

      {/* Barra de pasos (solo cuando estamos en el flujo principal) */}
      {pasoIndex >= 0 && (
        <div className="flex gap-2">
          {pasos.map((label, i) => (
            <div key={label} className="flex-1">
              <div
                className={`h-1.5 rounded-full transition-all ${i <= pasoIndex ? "bg-indigo-600" : "bg-slate-200"}`}
              />
              <p className={`text-xs font-semibold mt-1.5 ${i <= pasoIndex ? "text-indigo-700" : "text-slate-400"}`}>
                {label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Error global */}
      {error && paso !== "error_final" && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex gap-3 text-red-800">
          <AlertCircle size={24} className="flex-shrink-0" />
          <p className="font-semibold">{error}</p>
        </div>
      )}

      {/* PASO: PROCESANDO */}
      {paso === "procesando" && (
        <div className="text-center py-20 bg-white rounded-3xl shadow-xl border border-slate-100">
          <Loader2 size={72} className="text-indigo-500 animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-black text-slate-700">Procesando de forma segura…</h2>
          <p className="text-slate-500 mt-2">Por favor no cierre esta ventana.</p>
        </div>
      )}

      {/* PASO: ÉXITO */}
      {paso === "exito" && resultado && (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 space-y-6">
          <div className="text-center">
            <CheckCircle size={80} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-3xl font-black text-green-700">¡Transferencia Exitosa!</h2>
            <p className="text-slate-500 mt-2">Su dinero fue enviado correctamente.</p>
          </div>

          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 space-y-3">
            {[
              { label: "Monto", value: resultado.monto },
              { label: "Destinatario", value: resultado.beneficiario },
              { label: "Referencia", value: resultado.referencia },
              { label: "Fecha y hora", value: resultado.fecha },
              { label: "Estado", value: "✅ Completada" },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-green-700 font-semibold">{item.label}</span>
                <span className="font-bold text-green-900 text-right">{item.value}</span>
              </div>
            ))}
          </div>

          <button
            onClick={reiniciar}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xl font-bold px-8 py-4 rounded-2xl shadow-lg transition-colors"
          >
            Hacer otra transferencia
          </button>
        </div>
      )}

      {/* PASO: ERROR FATAL */}
      {paso === "error_final" && (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 space-y-6 text-center">
          <AlertCircle size={80} className="text-red-500 mx-auto" />
          <h2 className="text-2xl font-black text-red-700">No pudimos procesar la transferencia</h2>
          <p className="text-slate-600 text-lg">Tu dinero no fue descontado. Intenta de nuevo.</p>
          {error && (
            <p className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm font-mono">
              {error}
            </p>
          )}
          <button
            onClick={() => { setError(null); setPaso("confirmar"); }}
            className="w-full bg-slate-700 hover:bg-slate-800 text-white font-bold px-8 py-4 rounded-2xl flex items-center justify-center gap-2"
          >
            <RefreshCw size={20} /> Intentar de nuevo
          </button>
          <button onClick={reiniciar} className="text-slate-500 font-semibold hover:underline">
            Cancelar y comenzar de nuevo
          </button>
        </div>
      )}

      {/* PASO 1: CUENTA ORIGEN */}
      {paso === "elegir_cuenta" && (
        <div className="bg-white rounded-3xl shadow-md border border-slate-100 p-8">
          <h2 className="text-xl font-bold text-slate-700 mb-6">Paso 1: ¿De qué cuenta desea enviar el dinero?</h2>
          {cuentas.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No tiene cuentas activas disponibles.</p>
          ) : (
            <div className="space-y-4">
              {cuentas.map((c) => {
                const saldo = ledgers[c.id_cuenta]?.saldo_actual;
                return (
                  <button
                    key={c.id_cuenta}
                    onClick={() => setCuentaOrigen(c.id_cuenta)}
                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
                      cuentaOrigen === c.id_cuenta
                        ? "border-indigo-600 bg-indigo-50"
                        : "border-slate-200 hover:border-indigo-300"
                    }`}
                  >
                    <p className="font-black text-lg text-slate-800">
                      {c.tipo_cuenta.charAt(0).toUpperCase() + c.tipo_cuenta.slice(1)} — {maskNumeroCuenta(c.numero_cuenta)}
                    </p>
                    <p className="text-slate-500 text-sm mt-1">{c.moneda}</p>
                    <p className={`text-2xl font-black mt-2 ${cuentaOrigen === c.id_cuenta ? "text-indigo-700" : "text-slate-700"}`}>
                      {saldo != null ? formatCOP(saldo) : "Saldo no disponible"}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
          <div className="mt-8 flex justify-end">
            <button
              disabled={!cuentaOrigen}
              onClick={() => setPaso("elegir_beneficiario")}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-7 py-3.5 rounded-xl flex items-center gap-2 text-lg"
            >
              Continuar <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: BENEFICIARIO */}
      {paso === "elegir_beneficiario" && (
        <div className="bg-white rounded-3xl shadow-md border border-slate-100 p-8">
          <button onClick={() => setPaso("elegir_cuenta")} className="text-indigo-600 font-bold flex items-center gap-1 mb-6 hover:underline">
            <ChevronLeft size={20} /> Volver a cuentas
          </button>
          <h2 className="text-xl font-bold text-slate-700 mb-6">Paso 2: ¿A quién le desea transferir?</h2>
          <div className="space-y-3 mb-6">
            {beneficiarios.map((b) => (
              <button
                key={b.id_beneficiario}
                onClick={() => setBeneficiario(b.id_beneficiario)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                  beneficiario === b.id_beneficiario ? "border-indigo-600 bg-indigo-50" : "border-slate-200 hover:border-indigo-300"
                }`}
              >
                <p className="font-bold text-lg text-slate-800">{b.nombre}</p>
                <p className="text-slate-500 font-mono text-sm mt-1">Cuenta: ****{b.cuenta_destino.slice(-4)}</p>
              </button>
            ))}

            {beneficiarios.length === 0 && !agregarModo && (
              <p className="text-slate-400 text-center py-6">No tiene destinatarios guardados.</p>
            )}
          </div>

          {!agregarModo ? (
            <button
              onClick={() => setAgregarModo(true)}
              className="w-full border-2 border-dashed border-indigo-300 rounded-2xl p-4 text-indigo-600 font-bold hover:bg-indigo-50 flex items-center justify-center gap-2 transition"
            >
              <Plus size={20} /> Añadir nuevo destinatario
            </button>
          ) : (
            <div className="border-2 border-indigo-200 rounded-2xl p-5 space-y-3 bg-indigo-50">
              <h3 className="font-bold text-indigo-800">Nuevo Destinatario</h3>
              <input
                type="text"
                placeholder="Nombre completo del destinatario"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                className="w-full border-2 border-slate-300 rounded-xl px-4 py-3 text-base focus:border-indigo-600 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Número de cuenta destino (exacto)"
                value={nuevaCuentaDest}
                onChange={(e) => setNuevaCuentaDest(e.target.value)}
                className="w-full border-2 border-slate-300 rounded-xl px-4 py-3 text-base font-mono focus:border-indigo-600 focus:outline-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleAgregarBeneficiario}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-xl"
                >
                  Guardar destinatario
                </button>
                <button
                  onClick={() => { setAgregarModo(false); setNuevoNombre(""); setNuevaCuentaDest(""); }}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-5 py-3 rounded-xl"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button
              disabled={!beneficiario}
              onClick={() => setPaso("detalles")}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-7 py-3.5 rounded-xl flex items-center gap-2 text-lg"
            >
              Continuar <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* PASO 3: DETALLES */}
      {paso === "detalles" && (
        <div className="bg-white rounded-3xl shadow-md border border-slate-100 p-8">
          <button onClick={() => setPaso("elegir_beneficiario")} className="text-indigo-600 font-bold flex items-center gap-1 mb-6 hover:underline">
            <ChevronLeft size={20} /> Volver a destinatario
          </button>
          <h2 className="text-xl font-bold text-slate-700 mb-8">Paso 3: Detalles de la transferencia</h2>

          <div className="space-y-6">
            <div>
              <label className="text-lg font-bold text-slate-700 block mb-2">Monto a enviar</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">$</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="0"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="w-full border-2 border-slate-300 rounded-xl pl-10 pr-4 py-5 text-2xl font-bold focus:border-indigo-600 focus:outline-none"
                />
              </div>
              {cuentaSelect && ledgers[cuentaSelect.id_cuenta] && (
                <p className="text-sm text-slate-500 mt-2">
                  Saldo disponible: <span className="font-bold text-green-700">{formatCOP(ledgers[cuentaSelect.id_cuenta]?.saldo_actual)}</span>
                </p>
              )}
            </div>
            <div>
              <label className="text-lg font-bold text-slate-700 block mb-2">Concepto (Opcional)</label>
              <input
                type="text"
                placeholder="Ej: Pago de arriendo, cuota…"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                className="w-full border-2 border-slate-300 rounded-xl px-4 py-4 text-lg focus:border-indigo-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              disabled={!monto || Number(monto) <= 0}
              onClick={() => setPaso("confirmar")}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-7 py-3.5 rounded-xl flex items-center gap-2 text-lg"
            >
              Revisar <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* PASO 4: CONFIRMAR */}
      {paso === "confirmar" && (
        <div className="bg-white rounded-3xl shadow-md border border-slate-100 p-8">
          <button onClick={() => setPaso("detalles")} className="text-indigo-600 font-bold flex items-center gap-1 mb-6 hover:underline">
            <ChevronLeft size={20} /> Volver a detalles
          </button>
          <h2 className="text-2xl font-black text-slate-800 mb-6">Paso 4: Verifique su transferencia</h2>

          <div className="bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-6 space-y-4 mb-8">
            {[
              { label: "Monto a enviar", value: formatCOP(monto), big: true },
              {
                label: "Para",
                value: `${benefSelect?.nombre ?? "—"} · ****${benefSelect?.cuenta_destino.slice(-4) ?? ""}`,
              },
              {
                label: "Desde tu cuenta",
                value: `${cuentaSelect?.tipo_cuenta ?? ""} · ${maskNumeroCuenta(cuentaSelect?.numero_cuenta)}`,
              },
              { label: "Concepto", value: concepto || "Sin concepto" },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center border-b border-indigo-200 pb-4 last:border-0 last:pb-0">
                <span className="text-indigo-700 font-semibold">{item.label}</span>
                <span className={`font-bold text-indigo-900 text-right ${item.big ? "text-2xl" : ""}`}>{item.value}</span>
              </div>
            ))}
          </div>

          <p className="text-slate-500 text-sm text-center mb-4">
            ¿Está seguro de que desea realizar esta transferencia?
          </p>

          <div className="flex gap-4">
            <button
              onClick={reiniciar}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 rounded-xl text-lg transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleTransferir}
              disabled={enviando}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 text-lg shadow-lg transition-colors"
            >
              <Send size={22} />
              Confirmar y Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
