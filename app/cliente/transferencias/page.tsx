"use client";
import { useEffect, useState } from "react";
import { obtenerSesion } from "@/lib/auth";
import {
  listAccounts, listRails, createBeneficiary, createTransfer,
  getLedgerBalance, buscarCuentaPorNumero, listBeneficiaries, updateBeneficiary, getCuentaPublica,
  Cuenta, RielPago, CuentaContable, DestinatarioPublico, Beneficiario,
} from "@/lib/api";
import {
  ArrowRightLeft, CheckCircle, AlertCircle, Send,
  ChevronRight, ChevronLeft, Loader2, RefreshCw, Search, User, Star,
} from "lucide-react";

const RIEL_INTERNO_ID = "00000000-0000-0000-0000-000000000101";

type Paso =
  | "elegir_cuenta"
  | "buscar_destinatario"
  | "detalles"
  | "confirmar"
  | "procesando"
  | "exito"
  | "error_final";

function formatCOP(v: string | number | null | undefined) {
  if (v == null) return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(n);
}

function maskNumeroCuenta(nc: string | null | undefined) {
  if (!nc) return "••••••••";
  return "****" + nc.slice(-4);
}

const PASOS_LABELS = ["1. Cuenta", "2. Destinatario", "3. Detalles", "4. Confirmar"];
const PASOS_KEYS: Paso[] = ["elegir_cuenta", "buscar_destinatario", "detalles", "confirmar"];

export default function ClienteTransferenciasPage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [rieles, setRieles] = useState<RielPago[]>([]);
  const [ledgers, setLedgers] = useState<Record<string, CuentaContable | null>>({});

  const [paso, setPaso] = useState<Paso>("elegir_cuenta");

  // Paso 1
  const [cuentaOrigen, setCuentaOrigen] = useState("");

  // Paso 2 — buscar por número de cuenta
  const [numeroCuentaDest, setNumeroCuentaDest] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [destinatario, setDestinatario] = useState<DestinatarioPublico | null>(null);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [favoritos, setFavoritos] = useState<Beneficiario[]>([]);
  const [idBeneficiarioUsado, setIdBeneficiarioUsado] = useState<string | null>(null);
  const [esFavorito, setEsFavorito] = useState(false);

  // Paso 3
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");

  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    monto: string;
    destinatario: string;
    referencia: string;
    fecha: string;
  } | null>(null);

  useEffect(() => {
    const sesion = obtenerSesion();
    async function cargar() {
      try {
        const [todasCuentas, r] = await Promise.all([
          listAccounts(),
          listRails().catch(() => [] as RielPago[]),
        ]);
        const misCuentas = todasCuentas.filter(
          (c) => c.id_usuario === sesion?.usuario.id_usuario && c.estado === "activa"
        );
        setCuentas(misCuentas);
        setRieles(r);

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
        if (sesion) {
          const bs = await listBeneficiaries(sesion.usuario.id_usuario).catch(() => [] as Beneficiario[]);
          setFavoritos(bs.filter((b) => b.favorito));
        }
      } catch {
        setError("No pudimos cargar su información. Intente nuevamente.");
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  function getRielInternoId(): string {
    const rielApi = rieles.find((r) => r.tipo === "interno" && r.activo);
    return rielApi ? rielApi.id_riel : RIEL_INTERNO_ID;
  }

  async function handleBuscarDestinatario() {
    if (!numeroCuentaDest.trim()) return;
    setBuscando(true);
    setErrorBusqueda(null);
    setDestinatario(null);
    try {
      const dest = await buscarCuentaPorNumero(numeroCuentaDest.trim());
      if (!dest) {
        setErrorBusqueda(
          "No se encontró ninguna cuenta activa con ese número. Verifique e intente nuevamente."
        );
      } else {
        // Validar que no sea la propia cuenta del remitente
        const cuentaOrig = cuentas.find((c) => c.id_cuenta === cuentaOrigen);
        if (cuentaOrig?.numero_cuenta === numeroCuentaDest.trim()) {
          setErrorBusqueda("No puedes transferir a tu propia cuenta.");
        } else {
          setDestinatario(dest);
        }
      }
    } catch {
      setErrorBusqueda("Error al buscar la cuenta. Intente nuevamente.");
    } finally {
      setBuscando(false);
    }
  }

  async function elegirFavorito(b: Beneficiario) {
    setBuscando(true);
    setErrorBusqueda(null);
    try {
      const dest = await getCuentaPublica(b.cuenta_destino);
      setDestinatario(dest);
      setNumeroCuentaDest("");
    } catch {
      setDestinatario(null);
      setErrorBusqueda("Esta cuenta favorita ya no está disponible.");
    } finally {
      setBuscando(false);
    }
  }

  async function alternarFavorito() {
    if (!idBeneficiarioUsado) return;
    const nuevo = !esFavorito;
    try {
      const b = await updateBeneficiary(idBeneficiarioUsado, { favorito: nuevo });
      setEsFavorito(nuevo);
      setFavoritos((prev) =>
        nuevo ? [b, ...prev.filter((x) => x.id_beneficiario !== b.id_beneficiario)] : prev.filter((x) => x.id_beneficiario !== b.id_beneficiario)
      );
    } catch {
      /* el aviso no es crítico */
    }
  }

  async function handleTransferir() {
    if (!destinatario) return;
    setEnviando(true);
    setPaso("procesando");
    setError(null);
    const idRiel = getRielInternoId();
    try {
      // Crear beneficiario automáticamente basado en la búsqueda
      const sesion = obtenerSesion();
      const beneficiario = await createBeneficiary({
        id_usuario: sesion!.usuario.id_usuario,
        nombre: destinatario.nombre_titular,
        cuenta_destino: destinatario.id_cuenta, // UUID interno
        banco_destino: "BankLite",
      });

      setIdBeneficiarioUsado(beneficiario.id_beneficiario);
      setEsFavorito(!!beneficiario.favorito);

      const res = await createTransfer({
        id_cuenta_origen: cuentaOrigen,
        id_beneficiario: beneficiario.id_beneficiario,
        id_riel: idRiel,
        monto,
        concepto,
        idempotency_key: crypto.randomUUID(),
      });

      if (res.transferencia.estado !== "completada") {
        throw new Error(
          `La transferencia no se completó (estado: ${res.transferencia.estado}). No se descontó dinero de su cuenta.`
        );
      }

      const fechaHora = new Date().toLocaleString("es-CO", {
        dateStyle: "long",
        timeStyle: "short",
      });
      setResultado({
        monto: formatCOP(monto),
        destinatario: destinatario.nombre_titular,
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
    setCuentaOrigen("");
    setNumeroCuentaDest("");
    setDestinatario(null);
    setErrorBusqueda(null);
    setError(null);
    setResultado(null);
    setIdBeneficiarioUsado(null);
    setEsFavorito(false);
  }

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 size={48} className="text-brand-500 animate-spin" />
        <p className="text-xl text-slate-500 font-semibold">Cargando su información…</p>
      </div>
    );

  const cuentaSelect = cuentas.find((c) => c.id_cuenta === cuentaOrigen);
  const pasoIndex = PASOS_KEYS.indexOf(paso);

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      {/* Encabezado */}
      <div className="flex items-center gap-4">
        <div className="bg-brand-100 p-3 rounded-2xl text-brand-600">
          <ArrowRightLeft size={28} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800">Transferir Dinero</h1>
          <p className="text-lg text-slate-500">Envíe por número de cuenta, paso a paso.</p>
        </div>
      </div>

      {/* Barra de progreso */}
      {pasoIndex >= 0 && (
        <div className="flex gap-1 sm:gap-2">
          {PASOS_LABELS.map((label, i) => (
            <div key={label} className="flex-1">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  i <= pasoIndex ? "bg-brand-500" : "bg-slate-200"
                }`}
              />
              <p
                className={`text-[10px] sm:text-xs font-semibold mt-1.5 ${
                  i <= pasoIndex ? "text-brand-700" : "text-slate-400"
                }`}
              >
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

      {/* PROCESANDO */}
      {paso === "procesando" && (
        <div className="text-center py-20 bg-white rounded-3xl shadow-xl border border-slate-100">
          <Loader2 size={72} className="text-brand-500 animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-black text-slate-700">Procesando de forma segura…</h2>
          <p className="text-slate-500 mt-2">Por favor no cierre esta ventana.</p>
        </div>
      )}

      {/* ÉXITO */}
      {paso === "exito" && resultado && (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-4 md:p-8 space-y-6">
          <div className="text-center">
            <CheckCircle size={80} className="text-brand-500 mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-black text-brand-700">¡Transferencia Exitosa!</h2>
            <p className="text-slate-500 mt-2">Su dinero fue enviado correctamente.</p>
          </div>
          <div className="bg-brand-50 border-2 border-brand-100 rounded-2xl p-6 space-y-3">
            {[
              { label: "Monto", value: resultado.monto },
              { label: "Destinatario", value: resultado.destinatario },
              { label: "Referencia", value: resultado.referencia },
              { label: "Fecha y hora", value: resultado.fecha },
              { label: "Estado", value: "✅ Completada" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex justify-between items-center border-b border-brand-100 pb-3 last:border-0 last:pb-0"
              >
                <span className="text-brand-700 font-semibold">{item.label}</span>
                <span className="font-bold text-brand-900 text-right">{item.value}</span>
              </div>
            ))}
          </div>
          <button
            onClick={alternarFavorito}
            className={`w-full flex items-center justify-center gap-2 font-bold px-6 py-3 rounded-2xl border-2 transition-colors ${
              esFavorito
                ? "bg-amber-50 border-amber-300 text-amber-700"
                : "bg-white border-slate-300 text-slate-700 hover:border-amber-300"
            }`}
          >
            <Star size={20} className={esFavorito ? "fill-amber-400 text-amber-500" : ""} />
            {esFavorito ? "Cuenta guardada en favoritas" : "Guardar esta cuenta como favorita"}
          </button>
          <button
            onClick={reiniciar}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white text-xl font-bold px-8 py-4 rounded-2xl shadow-lg transition-colors"
          >
            Hacer otra transferencia
          </button>
        </div>
      )}

      {/* ERROR FINAL */}
      {paso === "error_final" && (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-4 md:p-8 space-y-6 text-center">
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
        <div className="bg-white rounded-3xl shadow-md border border-slate-100 p-4 md:p-8">
          <h2 className="text-xl font-bold text-slate-700 mb-6">
            Paso 1: ¿De qué cuenta desea enviar el dinero?
          </h2>
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
                        ? "border-brand-600 bg-brand-50"
                        : "border-slate-200 hover:border-brand-500"
                    }`}
                  >
                    <p className="font-black text-lg text-slate-800">
                      {c.tipo_cuenta.charAt(0).toUpperCase() + c.tipo_cuenta.slice(1)} —{" "}
                      {maskNumeroCuenta(c.numero_cuenta)}
                    </p>
                    <p className="text-slate-500 text-sm mt-1">{c.moneda}</p>
                    <p
                      className={`text-2xl font-black mt-2 ${
                        cuentaOrigen === c.id_cuenta ? "text-brand-700" : "text-slate-700"
                      }`}
                    >
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
              onClick={() => setPaso("buscar_destinatario")}
              className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold px-7 py-3.5 rounded-xl flex items-center gap-2 text-lg"
            >
              Continuar <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: BUSCAR DESTINATARIO POR NÚMERO DE CUENTA */}
      {paso === "buscar_destinatario" && (
        <div className="bg-white rounded-3xl shadow-md border border-slate-100 p-4 md:p-8">
          <button
            onClick={() => { setPaso("elegir_cuenta"); setDestinatario(null); setErrorBusqueda(null); }}
            className="text-brand-600 font-bold flex items-center gap-1 mb-6 hover:underline"
          >
            <ChevronLeft size={20} /> Volver a cuentas
          </button>
          <h2 className="text-xl font-bold text-slate-700 mb-2">
            Paso 2: ¿A quién desea enviar?
          </h2>
          <p className="text-slate-500 mb-6">
            Introduce el número de cuenta del destinatario (10 dígitos).
          </p>

          <div className="space-y-4">
            {favoritos.length > 0 && (
              <div>
                <p className="text-sm font-bold text-slate-600 mb-2 flex items-center gap-1">
                  <Star size={16} className="fill-amber-400 text-amber-500" /> Tus cuentas favoritas
                </p>
                <div className="flex flex-wrap gap-2">
                  {favoritos.map((f) => (
                    <button
                      key={f.id_beneficiario}
                      type="button"
                      onClick={() => elegirFavorito(f)}
                      className="px-4 py-2 rounded-full border-2 border-amber-200 bg-amber-50 text-amber-800 font-semibold hover:border-amber-400 transition-colors"
                    >
                      {f.alias || f.nombre || "Cuenta favorita"}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                placeholder="Ej: 1234567890"
                value={numeroCuentaDest}
                onChange={(e) => {
                  setNumeroCuentaDest(e.target.value.replace(/\D/g, ""));
                  setDestinatario(null);
                  setErrorBusqueda(null);
                }}
                className="flex-1 border-2 border-slate-300 rounded-xl px-4 py-3 sm:py-4 text-lg sm:text-xl font-mono focus:border-brand-600 focus:outline-none"
              />
              <button
                onClick={handleBuscarDestinatario}
                disabled={buscando || numeroCuentaDest.length < 6}
                className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold px-5 py-3 sm:py-0 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {buscando ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                {buscando ? "" : "Buscar"}
              </button>
            </div>

            {errorBusqueda && (
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex gap-3 text-red-800">
                <AlertCircle size={22} className="flex-shrink-0" />
                <p className="font-semibold">{errorBusqueda}</p>
              </div>
            )}

            {/* Tarjeta del destinatario encontrado */}
            {destinatario && (
              <div className="bg-brand-50 border-2 border-brand-500 rounded-2xl p-6 space-y-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-brand-100 p-2.5 rounded-full">
                    <User size={24} className="text-brand-700" />
                  </div>
                  <p className="text-brand-700 font-black text-lg">DESTINATARIO ENCONTRADO</p>
                </div>
                {[
                  { label: "Nombre", value: destinatario.nombre_titular },
                  { label: "Cuenta", value: destinatario.numero_cuenta_enmascarado },
                  { label: "Tipo de cuenta", value: destinatario.tipo_cuenta.charAt(0).toUpperCase() + destinatario.tipo_cuenta.slice(1) },
                  { label: "Moneda", value: destinatario.moneda },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex justify-between items-center border-b border-brand-100 pb-2 last:border-0 last:pb-0"
                  >
                    <span className="text-brand-700 font-semibold text-sm">{item.label}</span>
                    <span className="font-bold text-brand-900">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              disabled={!destinatario}
              onClick={() => setPaso("detalles")}
              className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold px-7 py-3.5 rounded-xl flex items-center gap-2 text-lg"
            >
              Continuar <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* PASO 3: MONTO Y CONCEPTO */}
      {paso === "detalles" && (() => {
        const saldoRaw = cuentaSelect ? ledgers[cuentaSelect.id_cuenta]?.saldo_actual : null;
        const saldoDisponible = saldoRaw != null ? parseFloat(String(saldoRaw)) : null;
        const montoNum = monto ? Number(monto) : 0;
        const excedeSaldo = saldoDisponible != null && montoNum > saldoDisponible;

        return (
        <div className="bg-white rounded-3xl shadow-md border border-slate-100 p-4 md:p-8">
          <button
            onClick={() => setPaso("buscar_destinatario")}
            className="text-brand-600 font-bold flex items-center gap-1 mb-6 hover:underline"
          >
            <ChevronLeft size={20} /> Volver a destinatario
          </button>
          <h2 className="text-xl font-bold text-slate-700 mb-8">Paso 3: Detalles de la transferencia</h2>

          <div className="space-y-6">
            <div>
              <label className="text-lg font-bold text-slate-700 block mb-2">Monto a enviar</label>
              {cuentaSelect && saldoDisponible != null && (
                <p className="text-sm text-slate-600 mb-3">
                  Saldo disponible:{" "}
                  <span className="font-bold text-brand-700">
                    {formatCOP(saldoDisponible)}
                  </span>
                </p>
              )}
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">
                  $
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="0"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className={`w-full border-2 rounded-xl pl-10 pr-4 py-5 text-2xl font-bold focus:outline-none ${
                    excedeSaldo
                      ? "border-red-400 focus:border-red-500"
                      : "border-slate-300 focus:border-brand-600"
                  }`}
                />
              </div>
              {excedeSaldo && (
                <div className="flex items-center gap-2 mt-2 text-red-600">
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <p className="text-sm font-semibold">El monto supera tu saldo disponible</p>
                </div>
              )}
            </div>
            <div>
              <label className="text-lg font-bold text-slate-700 block mb-2">Concepto (Opcional)</label>
              <input
                type="text"
                placeholder="Ej: Pago de arriendo, cuota…"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                className="w-full border-2 border-slate-300 rounded-xl px-4 py-4 text-lg focus:border-brand-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              disabled={!monto || Number(monto) <= 0 || excedeSaldo}
              onClick={() => setPaso("confirmar")}
              className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold px-7 py-3.5 rounded-xl flex items-center gap-2 text-lg"
            >
              Revisar <ChevronRight size={20} />
            </button>
          </div>
        </div>
        );
      })()}

      {/* PASO 4: CONFIRMAR */}
      {paso === "confirmar" && destinatario && (
        <div className="bg-white rounded-3xl shadow-md border border-slate-100 p-4 md:p-8">
          <button
            onClick={() => setPaso("detalles")}
            className="text-brand-600 font-bold flex items-center gap-1 mb-6 hover:underline"
          >
            <ChevronLeft size={20} /> Volver a detalles
          </button>
          <h2 className="text-2xl font-black text-slate-800 mb-6">Paso 4: Verifique su transferencia</h2>

          <div className="bg-brand-50 border-2 border-brand-100 rounded-2xl p-6 space-y-4 mb-8">
            {[
              { label: "Monto a enviar", value: formatCOP(monto), big: true },
              { label: "Para", value: `${destinatario.nombre_titular} · ${destinatario.numero_cuenta_enmascarado}` },
              { label: "Tipo de cuenta destino", value: destinatario.tipo_cuenta.charAt(0).toUpperCase() + destinatario.tipo_cuenta.slice(1) },
              { label: "Desde tu cuenta", value: `${cuentaSelect?.tipo_cuenta ?? ""} · ${maskNumeroCuenta(cuentaSelect?.numero_cuenta)}` },
              { label: "Concepto", value: concepto || "Sin concepto" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex justify-between items-center border-b border-brand-100 pb-4 last:border-0 last:pb-0"
              >
                <span className="text-brand-700 font-semibold">{item.label}</span>
                <span
                  className={`font-bold text-brand-900 text-right ${item.big ? "text-lg sm:text-2xl" : ""}`}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          <p className="text-slate-500 text-sm text-center mb-4">
            ¿Está seguro de que desea realizar esta transferencia?
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={reiniciar}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 rounded-xl text-lg transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleTransferir}
              disabled={enviando}
              className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 text-lg shadow-lg transition-colors"
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
