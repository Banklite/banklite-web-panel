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

type Paso = "elegir_cuenta" | "buscar_destinatario" | "detalles" | "confirmar" | "procesando" | "exito" | "error_final";

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

const PASOS_LABELS = ["Cuenta", "Destinatario", "Monto", "Confirmar"];
const PASOS_KEYS: Paso[] = ["elegir_cuenta", "buscar_destinatario", "detalles", "confirmar"];

export default function ClienteTransferenciasPage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [rieles, setRieles] = useState<RielPago[]>([]);
  const [ledgers, setLedgers] = useState<Record<string, CuentaContable | null>>({});
  const [paso, setPaso] = useState<Paso>("elegir_cuenta");

  const [cuentaOrigen, setCuentaOrigen] = useState("");
  const [numeroCuentaDest, setNumeroCuentaDest] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [destinatario, setDestinatario] = useState<DestinatarioPublico | null>(null);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [favoritos, setFavoritos] = useState<Beneficiario[]>([]);
  const [idBeneficiarioUsado, setIdBeneficiarioUsado] = useState<string | null>(null);
  const [esFavorito, setEsFavorito] = useState(false);

  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");

  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ monto: string; destinatario: string; referencia: string; fecha: string } | null>(null);

  useEffect(() => {
    const sesion = obtenerSesion();
    async function cargar() {
      try {
        const [todasCuentas, r] = await Promise.all([listAccounts(), listRails().catch(() => [] as RielPago[])]);
        const misCuentas = todasCuentas.filter((c) => c.id_usuario === sesion?.usuario.id_usuario && c.estado === "activa");
        setCuentas(misCuentas);
        setRieles(r);
        const ledgerMap: Record<string, CuentaContable | null> = {};
        await Promise.all(misCuentas.map(async (c) => {
          try { ledgerMap[c.id_cuenta] = await getLedgerBalance(c.id_cuenta); } catch { ledgerMap[c.id_cuenta] = null; }
        }));
        setLedgers(ledgerMap);
        if (sesion) {
          const bs = await listBeneficiaries(sesion.usuario.id_usuario).catch(() => [] as Beneficiario[]);
          setFavoritos(bs.filter((b) => b.favorito));
        }
      } catch { setError("No pudimos cargar tu información."); } finally { setLoading(false); }
    }
    cargar();
  }, []);

  function getRielInternoId() {
    const rielApi = rieles.find((r) => r.tipo === "interno" && r.activo);
    return rielApi ? rielApi.id_riel : RIEL_INTERNO_ID;
  }

  async function handleBuscarDestinatario() {
    if (!numeroCuentaDest.trim()) return;
    setBuscando(true); setErrorBusqueda(null); setDestinatario(null);
    try {
      const dest = await buscarCuentaPorNumero(numeroCuentaDest.trim());
      if (!dest) { setErrorBusqueda("No se encontró ninguna cuenta activa con ese número."); }
      else {
        const cuentaOrig = cuentas.find((c) => c.id_cuenta === cuentaOrigen);
        if (cuentaOrig?.numero_cuenta === numeroCuentaDest.trim()) { setErrorBusqueda("No puedes transferir a tu propia cuenta."); }
        else setDestinatario(dest);
      }
    } catch { setErrorBusqueda("Error al buscar la cuenta."); } finally { setBuscando(false); }
  }

  async function elegirFavorito(b: Beneficiario) {
    setBuscando(true); setErrorBusqueda(null);
    try { const dest = await getCuentaPublica(b.cuenta_destino); setDestinatario(dest); setNumeroCuentaDest(""); }
    catch { setDestinatario(null); setErrorBusqueda("Esta cuenta favorita ya no está disponible."); }
    finally { setBuscando(false); }
  }

  async function alternarFavorito() {
    if (!idBeneficiarioUsado) return;
    const nuevo = !esFavorito;
    try {
      const b = await updateBeneficiary(idBeneficiarioUsado, { favorito: nuevo });
      setEsFavorito(nuevo);
      setFavoritos((prev) => nuevo ? [b, ...prev.filter((x) => x.id_beneficiario !== b.id_beneficiario)] : prev.filter((x) => x.id_beneficiario !== b.id_beneficiario));
    } catch { /* no crítico */ }
  }

  async function handleTransferir() {
    if (!destinatario) return;
    setEnviando(true); setPaso("procesando"); setError(null);
    const idRiel = getRielInternoId();
    try {
      const sesion = obtenerSesion();
      const beneficiario = await createBeneficiary({ id_usuario: sesion!.usuario.id_usuario, nombre: destinatario.nombre_titular, cuenta_destino: destinatario.id_cuenta, banco_destino: "BankLite" });
      setIdBeneficiarioUsado(beneficiario.id_beneficiario);
      setEsFavorito(!!beneficiario.favorito);
      const res = await createTransfer({ id_cuenta_origen: cuentaOrigen, id_beneficiario: beneficiario.id_beneficiario, id_riel: idRiel, monto, concepto, idempotency_key: crypto.randomUUID() });
      if (res.transferencia.estado !== "completada") throw new Error(`La transferencia no se completó (estado: ${res.transferencia.estado}).`);
      setResultado({ monto: formatCOP(monto), destinatario: destinatario.nombre_titular, referencia: res.transferencia.referencia ?? "BL-" + Date.now(), fecha: new Date().toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" }) });
      setPaso("exito");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setPaso("error_final");
    } finally { setEnviando(false); }
  }

  function reiniciar() {
    setPaso("elegir_cuenta"); setMonto(""); setConcepto(""); setCuentaOrigen(""); setNumeroCuentaDest("");
    setDestinatario(null); setErrorBusqueda(null); setError(null); setResultado(null); setIdBeneficiarioUsado(null); setEsFavorito(false);
  }

  const cuentaSelect = cuentas.find((c) => c.id_cuenta === cuentaOrigen);
  const pasoIndex = PASOS_KEYS.indexOf(paso);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 size={40} className="text-white animate-spin" />
      <p className="text-sm text-neutral-400 font-semibold">Cargando información…</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
          <ArrowRightLeft size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Transferir Dinero</h1>
          <p className="text-sm text-neutral-400">Paso a paso, de forma segura</p>
        </div>
      </div>

      {/* Progress */}
      {pasoIndex >= 0 && (
        <div className="flex gap-2">
          {PASOS_LABELS.map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-1 rounded-full transition-all ${i <= pasoIndex ? "bg-white" : "bg-white/10"}`} />
              <p className={`text-[10px] font-semibold mt-1.5 ${i <= pasoIndex ? "text-neutral-300" : "text-neutral-600"}`}>{i + 1}. {label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Global error (not final) */}
      {error && paso !== "error_final" && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-3 text-red-400">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* PROCESANDO */}
      {paso === "procesando" && (
        <div className="apple-glass-card rounded-3xl p-16 text-center space-y-4">
          <Loader2 size={56} className="text-white animate-spin mx-auto" />
          <h2 className="text-xl font-extrabold text-white">Procesando de forma segura…</h2>
          <p className="text-sm text-neutral-400">Por favor no cierre esta ventana.</p>
        </div>
      )}

      {/* ÉXITO */}
      {paso === "exito" && resultado && (
        <div className="apple-glass-card rounded-3xl p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle size={48} className="text-emerald-400" />
            </div>
            <h2 className="text-2xl font-extrabold text-white">¡Transferencia exitosa!</h2>
            <p className="text-sm text-neutral-400">Tu dinero fue enviado correctamente.</p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 space-y-3">
            {[
              { label: "Monto", value: resultado.monto },
              { label: "Destinatario", value: resultado.destinatario },
              { label: "Referencia", value: resultado.referencia },
              { label: "Fecha y hora", value: resultado.fecha },
              { label: "Estado", value: "Completada" },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center border-b border-white/[0.06] pb-3 last:border-0 last:pb-0">
                <span className="text-sm text-neutral-400">{item.label}</span>
                <span className="font-bold text-white text-right text-sm">{item.value}</span>
              </div>
            ))}
          </div>
          <button onClick={alternarFavorito} className={`w-full flex items-center justify-center gap-2 font-bold px-6 py-3.5 rounded-2xl border transition-all text-sm ${esFavorito ? "border-amber-400/30 bg-amber-500/10 text-amber-400" : "border-white/10 bg-white/[0.03] text-neutral-300 hover:border-white/20"}`}>
            <Star size={18} className={esFavorito ? "fill-amber-400" : ""} />
            {esFavorito ? "Guardado en favoritos" : "Guardar en favoritos"}
          </button>
          <button onClick={reiniciar} className="w-full bg-white hover:bg-neutral-100 text-black font-extrabold px-8 py-3.5 rounded-2xl text-sm transition active:scale-[0.98]">
            Hacer otra transferencia
          </button>
        </div>
      )}

      {/* ERROR FINAL */}
      {paso === "error_final" && (
        <div className="apple-glass-card rounded-3xl p-8 space-y-6 text-center">
          <div className="inline-flex p-4 rounded-3xl bg-red-500/10 border border-red-500/20">
            <AlertCircle size={48} className="text-red-400" />
          </div>
          <h2 className="text-xl font-extrabold text-white">No se pudo procesar</h2>
          <p className="text-sm text-neutral-400">Tu dinero no fue descontado. Puedes intentarlo de nuevo.</p>
          {error && <p className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs font-mono text-left">{error}</p>}
          <div className="space-y-2">
            <button onClick={() => { setError(null); setPaso("confirmar"); }} className="w-full apple-glass-button rounded-2xl py-3.5 text-sm font-bold text-white flex items-center justify-center gap-2">
              <RefreshCw size={16} /> Intentar de nuevo
            </button>
            <button onClick={reiniciar} className="text-sm text-neutral-500 hover:text-neutral-300 font-semibold transition">Cancelar y comenzar de nuevo</button>
          </div>
        </div>
      )}

      {/* PASO 1: CUENTA ORIGEN */}
      {paso === "elegir_cuenta" && (
        <div className="apple-glass-card rounded-3xl p-6 sm:p-8 space-y-5">
          <div>
            <h2 className="text-base font-extrabold text-white mb-1">Selecciona la cuenta de origen</h2>
            <p className="text-xs text-neutral-500">¿Desde dónde quieres enviar el dinero?</p>
          </div>
          {cuentas.length === 0 ? (
            <p className="text-neutral-500 text-sm text-center py-8">No tienes cuentas activas disponibles.</p>
          ) : (
            <div className="space-y-3">
              {cuentas.map((c) => {
                const saldo = ledgers[c.id_cuenta]?.saldo_actual;
                const selected = cuentaOrigen === c.id_cuenta;
                return (
                  <button key={c.id_cuenta} onClick={() => setCuentaOrigen(c.id_cuenta)}
                    className={`w-full text-left p-5 rounded-2xl border transition-all ${selected ? "border-white/30 bg-white/[0.08]" : "border-white/[0.08] hover:border-white/20 bg-white/[0.03]"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white text-sm capitalize">{c.tipo_cuenta} — {maskNumeroCuenta(c.numero_cuenta)}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">{c.moneda}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-extrabold ${selected ? "text-white" : "text-neutral-300"}`}>
                          {saldo != null ? formatCOP(saldo) : "—"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex justify-end">
            <button disabled={!cuentaOrigen} onClick={() => setPaso("buscar_destinatario")}
              className="bg-white hover:bg-neutral-100 disabled:opacity-40 text-black font-extrabold px-6 py-3 rounded-2xl text-sm flex items-center gap-2 transition active:scale-[0.98]">
              Continuar <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: BUSCAR DESTINATARIO */}
      {paso === "buscar_destinatario" && (
        <div className="apple-glass-card rounded-3xl p-6 sm:p-8 space-y-5">
          <button onClick={() => { setPaso("elegir_cuenta"); setDestinatario(null); setErrorBusqueda(null); }} className="text-xs font-semibold text-neutral-400 hover:text-white flex items-center gap-1 transition">
            <ChevronLeft size={14} /> Volver
          </button>
          <div>
            <h2 className="text-base font-extrabold text-white mb-1">¿A quién vas a enviar?</h2>
            <p className="text-xs text-neutral-500">Ingresa el número de cuenta del destinatario.</p>
          </div>

          {favoritos.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Star size={12} className="fill-amber-400 text-amber-400" /> Favoritos
              </p>
              <div className="flex flex-wrap gap-2">
                {favoritos.map((f) => (
                  <button key={f.id_beneficiario} type="button" onClick={() => elegirFavorito(f)}
                    className="px-3 py-1.5 rounded-full border border-amber-400/20 bg-amber-500/10 text-amber-400 text-xs font-semibold hover:border-amber-400/40 transition">
                    {f.alias || f.nombre || "Favorito"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <input type="text" inputMode="numeric" maxLength={10} placeholder="Número de cuenta (10 dígitos)" value={numeroCuentaDest}
              onChange={(e) => { setNumeroCuentaDest(e.target.value.replace(/\D/g, "")); setDestinatario(null); setErrorBusqueda(null); }}
              className="flex-1 bg-white/[0.06] border border-white/[0.12] rounded-2xl px-4 py-3.5 text-base font-mono text-white placeholder:text-neutral-600 focus:outline-none focus:border-white/30 transition"
            />
            <button onClick={handleBuscarDestinatario} disabled={buscando || numeroCuentaDest.length < 6}
              className="apple-glass-button rounded-2xl px-5 py-3.5 text-white font-bold flex items-center gap-2 text-sm disabled:opacity-40">
              {buscando ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            </button>
          </div>

          {errorBusqueda && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-3 text-red-400">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm font-semibold">{errorBusqueda}</p>
            </div>
          )}

          {destinatario && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <User size={18} />
                </div>
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Destinatario encontrado</p>
              </div>
              {[
                { label: "Nombre", value: destinatario.nombre_titular },
                { label: "Cuenta", value: destinatario.numero_cuenta_enmascarado },
                { label: "Tipo", value: destinatario.tipo_cuenta.charAt(0).toUpperCase() + destinatario.tipo_cuenta.slice(1) },
              ].map((item) => (
                <div key={item.label} className="flex justify-between text-sm border-b border-emerald-500/10 pb-2 last:border-0 last:pb-0">
                  <span className="text-neutral-400">{item.label}</span>
                  <span className="font-bold text-white">{item.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <button disabled={!destinatario} onClick={() => setPaso("detalles")}
              className="bg-white hover:bg-neutral-100 disabled:opacity-40 text-black font-extrabold px-6 py-3 rounded-2xl text-sm flex items-center gap-2 transition active:scale-[0.98]">
              Continuar <ChevronRight size={18} />
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
          <div className="apple-glass-card rounded-3xl p-6 sm:p-8 space-y-5">
            <button onClick={() => setPaso("buscar_destinatario")} className="text-xs font-semibold text-neutral-400 hover:text-white flex items-center gap-1 transition">
              <ChevronLeft size={14} /> Volver
            </button>
            <div>
              <h2 className="text-base font-extrabold text-white mb-1">Detalles de la transferencia</h2>
              {cuentaSelect && saldoDisponible != null && (
                <p className="text-xs text-neutral-500">Saldo disponible: <span className="text-white font-bold">{formatCOP(saldoDisponible)}</span></p>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-2">Monto a enviar (COP)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xl">$</span>
                <input type="number" min="1" step="1" placeholder="0" value={monto} onChange={(e) => setMonto(e.target.value)}
                  className={`w-full bg-white/[0.06] border rounded-2xl pl-9 pr-4 py-4 text-2xl font-black text-white focus:outline-none transition ${excedeSaldo ? "border-red-400/50" : "border-white/[0.12] focus:border-white/30"}`}
                />
              </div>
              {excedeSaldo && (
                <div className="flex items-center gap-2 mt-2 text-red-400">
                  <AlertCircle size={14} />
                  <p className="text-xs font-semibold">El monto supera tu saldo disponible</p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-2">Concepto (opcional)</label>
              <input type="text" placeholder="Ej: Pago de arriendo…" value={concepto} onChange={(e) => setConcepto(e.target.value)}
                className="w-full bg-white/[0.06] border border-white/[0.12] rounded-2xl px-4 py-3.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-white/30 transition"
              />
            </div>
            <div className="flex justify-end">
              <button disabled={!monto || Number(monto) <= 0 || excedeSaldo} onClick={() => setPaso("confirmar")}
                className="bg-white hover:bg-neutral-100 disabled:opacity-40 text-black font-extrabold px-6 py-3 rounded-2xl text-sm flex items-center gap-2 transition active:scale-[0.98]">
                Revisar <ChevronRight size={18} />
              </button>
            </div>
          </div>
        );
      })()}

      {/* PASO 4: CONFIRMAR */}
      {paso === "confirmar" && destinatario && (
        <div className="apple-glass-card rounded-3xl p-6 sm:p-8 space-y-5">
          <button onClick={() => setPaso("detalles")} className="text-xs font-semibold text-neutral-400 hover:text-white flex items-center gap-1 transition">
            <ChevronLeft size={14} /> Volver
          </button>
          <h2 className="text-base font-extrabold text-white">Confirma tu transferencia</h2>

          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 space-y-3">
            {[
              { label: "Monto a enviar", value: formatCOP(monto), big: true },
              { label: "Para", value: `${destinatario.nombre_titular} · ${destinatario.numero_cuenta_enmascarado}` },
              { label: "Tipo de cuenta destino", value: destinatario.tipo_cuenta.charAt(0).toUpperCase() + destinatario.tipo_cuenta.slice(1) },
              { label: "Desde tu cuenta", value: `${cuentaSelect?.tipo_cuenta ?? ""} · ${maskNumeroCuenta(cuentaSelect?.numero_cuenta)}` },
              { label: "Concepto", value: concepto || "Sin concepto" },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center border-b border-white/[0.06] pb-3 last:border-0 last:pb-0">
                <span className="text-sm text-neutral-400">{item.label}</span>
                <span className={`font-bold text-white text-right ${item.big ? "text-xl" : "text-sm"}`}>{item.value}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={reiniciar} className="flex-1 border border-white/[0.12] hover:border-white/25 text-neutral-400 hover:text-white font-bold py-3.5 rounded-2xl text-sm transition">
              Cancelar
            </button>
            <button onClick={handleTransferir} disabled={enviando}
              className="flex-1 bg-white hover:bg-neutral-100 disabled:opacity-40 text-black font-extrabold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 transition active:scale-[0.98]">
              <Send size={16} /> Confirmar y Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
