"use client";
import { useEffect, useState } from "react";
import { obtenerSesion } from "@/lib/auth";
import {
  listCards, listAccounts, solicitarTarjetaCliente, revelarNumeroTarjeta,
  toggleFreezeCard, Tarjeta, Cuenta,
} from "@/lib/api";
import {
  CreditCard, Eye, EyeOff, Lock, CheckCircle, AlertCircle,
  Loader2, Plus, ShieldCheck, ShieldX, Snowflake, Sun,
} from "lucide-react";

function maskNumeroTarjeta(nt: string | null | undefined) {
  if (!nt) return "**** **** **** ****";
  return `**** **** **** ${nt.slice(-4)}`;
}

function tipoLabel(t: string) {
  const l = t.toLowerCase();
  if (l === "debito" || l === "débito") return "Débito";
  if (l === "credito" || l === "crédito") return "Crédito";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function maskNumeroCuenta(nc: string | null | undefined) {
  if (!nc) return "****";
  return `****${nc.slice(-4)}`;
}

export default function ClienteTarjetasPage() {
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [numerosRevelados, setNumerosRevelados] = useState<Record<string, string>>({});
  const [mostrarNumero, setMostrarNumero] = useState<Record<string, boolean>>({});
  const [cargandoNumero, setCargandoNumero] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [congelando, setCongelando] = useState<Record<string, boolean>>({});
  const [errorCongelar, setErrorCongelar] = useState<string | null>(null);

  const [emitiendo, setEmitiendo] = useState(false);
  const [solicitando, setSolicitando] = useState(false);
  const [resultadoEmision, setResultadoEmision] = useState<Tarjeta | null>(null);
  const [errorEmision, setErrorEmision] = useState<string | null>(null);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState("");
  const [tipoSeleccionado, setTipoSeleccionado] = useState<"virtual" | "fisica">("virtual");

  const sesion = obtenerSesion();
  const titular = sesion ? [sesion.usuario.nombre, sesion.usuario.apellido].filter(Boolean).join(" ").toUpperCase() : "";

  useEffect(() => {
    async function cargar() {
      try {
        if (!sesion) return;
        const [tarjetasResult, cuentasResult] = await Promise.allSettled([listCards(), listAccounts()]);
        const todasLasCuentas = cuentasResult.status === "fulfilled" ? cuentasResult.value : [];
        const todasLasTarjetas = tarjetasResult.status === "fulfilled" ? tarjetasResult.value : [];
        if (cuentasResult.status === "rejected") { setError("No pudimos cargar sus cuentas."); setLoading(false); return; }
        const misCuentas = todasLasCuentas.filter((cu) => cu.id_usuario === sesion.usuario.id_usuario);
        const misCuentaIds = new Set(misCuentas.map((cu) => cu.id_cuenta));
        setTarjetas(todasLasTarjetas.filter((ta) => misCuentaIds.has(ta.id_cuenta)));
        setCuentas(misCuentas);
        const primeraActiva = misCuentas.find((c) => c.estado === "activa");
        if (primeraActiva) setCuentaSeleccionada(primeraActiva.id_cuenta);
      } catch { setError("Error inesperado al cargar sus datos."); } finally { setLoading(false); }
    }
    cargar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleNumero(tarjetaId: string) {
    const yaVisible = mostrarNumero[tarjetaId];
    if (yaVisible) { setMostrarNumero((prev) => ({ ...prev, [tarjetaId]: false })); return; }
    if (numerosRevelados[tarjetaId]) { setMostrarNumero((prev) => ({ ...prev, [tarjetaId]: true })); return; }
    if (!sesion) return;
    setCargandoNumero((prev) => ({ ...prev, [tarjetaId]: true }));
    try {
      const resultado = await revelarNumeroTarjeta(tarjetaId, sesion.usuario.id_usuario);
      setNumerosRevelados((prev) => ({ ...prev, [tarjetaId]: resultado.numero_formateado }));
      setMostrarNumero((prev) => ({ ...prev, [tarjetaId]: true }));
    } catch { /* permanece enmascarado */ } finally { setCargandoNumero((prev) => ({ ...prev, [tarjetaId]: false })); }
  }

  async function handleToggleFreeze(tarjetaId: string) {
    if (congelando[tarjetaId]) return;
    setCongelando((prev) => ({ ...prev, [tarjetaId]: true })); setErrorCongelar(null);
    try {
      const actualizada = await toggleFreezeCard(tarjetaId);
      setTarjetas((prev) => prev.map((t) => (t.id_tarjeta === tarjetaId ? { ...t, ...actualizada, numero_tarjeta: actualizada.numero_tarjeta ?? t.numero_tarjeta } : t)));
    } catch (err: unknown) {
      setErrorCongelar(err instanceof Error ? err.message : "No fue posible cambiar el estado.");
    } finally { setCongelando((prev) => ({ ...prev, [tarjetaId]: false })); }
  }

  async function handleSolicitarTarjeta() {
    if (!sesion || !cuentaSeleccionada || solicitando) return;
    setSolicitando(true); setErrorEmision(null); setResultadoEmision(null);
    try {
      const tarjeta = await solicitarTarjetaCliente({ id_usuario: sesion.usuario.id_usuario, id_cuenta: cuentaSeleccionada, tipo_tarjeta: tipoSeleccionado });
      setResultadoEmision(tarjeta);
      const [t] = await Promise.all([listCards()]);
      const misCuentaIds = new Set(cuentas.map((cu) => cu.id_cuenta));
      setTarjetas(t.filter((ta) => misCuentaIds.has(ta.id_cuenta)));
    } catch (err: unknown) { setErrorEmision(err instanceof Error ? err.message : "No fue posible emitir la tarjeta."); }
    finally { setSolicitando(false); }
  }

  const estadoUsuario = sesion?.usuario.estado;
  const cuentasActivas = cuentas.filter((c) => c.estado === "activa");

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 size={40} className="text-white animate-spin" />
      <p className="text-sm text-neutral-400 font-semibold">Cargando tus tarjetas…</p>
    </div>
  );

  if (error) return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 flex items-center gap-4">
      <AlertCircle size={28} className="text-red-400 flex-shrink-0" />
      <p className="text-red-400 font-semibold">{error}</p>
    </div>
  );

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <CreditCard size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Mis Tarjetas</h1>
            <p className="text-sm text-neutral-400">Gestiona y controla tus tarjetas bancarias</p>
          </div>
        </div>
        {!emitiendo && (
          <button onClick={() => { setEmitiendo(true); setResultadoEmision(null); setErrorEmision(null); }}
            className="flex items-center gap-2 apple-glass-button rounded-2xl px-5 py-2.5 text-sm font-bold text-white">
            <Plus size={18} /> Solicitar Tarjeta
          </button>
        )}
      </div>

      {/* Panel de solicitud */}
      {emitiendo && (
        <div className="apple-glass-card rounded-3xl p-6 sm:p-8 space-y-5">
          <h2 className="text-base font-extrabold text-white">Solicitar Nueva Tarjeta</h2>

          {estadoUsuario !== "verificado" && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex gap-3">
              <ShieldX size={24} className="text-amber-400 flex-shrink-0" />
              <div>
                <p className="font-bold text-amber-400">Identidad no verificada</p>
                <p className="text-xs text-neutral-400 mt-1">No puedes solicitar una tarjeta hasta completar la verificación de identidad con tu cédula.</p>
              </div>
            </div>
          )}

          {estadoUsuario === "verificado" && cuentasActivas.length === 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex gap-3">
              <AlertCircle size={24} className="text-amber-400 flex-shrink-0" />
              <div>
                <p className="font-bold text-amber-400">Sin cuenta activa</p>
                <p className="text-xs text-neutral-400 mt-1">Necesitas una cuenta activa para solicitar una tarjeta. Contacta al administrador.</p>
              </div>
            </div>
          )}

          {estadoUsuario === "verificado" && cuentasActivas.length > 0 && !resultadoEmision && (
            <div className="space-y-5">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex gap-2 items-center">
                <ShieldCheck size={18} className="text-emerald-400 flex-shrink-0" />
                <p className="text-emerald-400 text-sm font-semibold">Identidad verificada. Puedes emitir tu tarjeta.</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-2">Cuenta bancaria asociada</label>
                <select value={cuentaSeleccionada} onChange={(e) => setCuentaSeleccionada(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/[0.12] rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-white/30 transition appearance-none">
                  {cuentasActivas.map((c) => (
                    <option key={c.id_cuenta} value={c.id_cuenta}>{c.tipo_cuenta.charAt(0).toUpperCase() + c.tipo_cuenta.slice(1)} — {maskNumeroCuenta(c.numero_cuenta)} · {c.moneda}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-2">Tipo de tarjeta</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["virtual", "fisica"] as const).map((tipo) => (
                    <button key={tipo} type="button" onClick={() => setTipoSeleccionado(tipo)}
                      className={`p-4 rounded-2xl border text-left transition-all ${tipoSeleccionado === tipo ? "border-white/30 bg-white/[0.08]" : "border-white/[0.08] hover:border-white/20 bg-white/[0.03]"}`}>
                      <p className="font-bold text-white capitalize text-sm">{tipo}</p>
                      <p className="text-xs text-neutral-500 mt-1">{tipo === "virtual" ? "Para compras en línea y pagos digitales" : "Tarjeta física con chip y contactless"}</p>
                    </button>
                  ))}
                </div>
              </div>

              {errorEmision && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-3 text-red-400">
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <p className="text-sm font-semibold">{errorEmision}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setEmitiendo(false)} className="flex-1 border border-white/[0.12] hover:border-white/25 text-neutral-400 hover:text-white font-bold py-3.5 rounded-2xl text-sm transition">Cancelar</button>
                <button onClick={handleSolicitarTarjeta} disabled={solicitando || !cuentaSeleccionada}
                  className="flex-1 bg-white hover:bg-neutral-100 disabled:opacity-40 text-black font-extrabold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 transition active:scale-[0.98]">
                  {solicitando ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  {solicitando ? "Emitiendo…" : "Emitir Tarjeta"}
                </button>
              </div>
            </div>
          )}

          {resultadoEmision && (
            <div className="space-y-5">
              <div className="text-center space-y-2">
                <div className="inline-flex p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle size={40} className="text-emerald-400" />
                </div>
                <h3 className="text-lg font-extrabold text-white">¡Tarjeta emitida correctamente!</h3>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 space-y-3">
                {[
                  { label: "Número de tarjeta", value: maskNumeroTarjeta(resultadoEmision.numero_tarjeta) },
                  { label: "Tipo", value: resultadoEmision.tipo_tarjeta.charAt(0).toUpperCase() + resultadoEmision.tipo_tarjeta.slice(1) },
                  { label: "Estado", value: "Activa" },
                  { label: "Fecha de emisión", value: new Date(resultadoEmision.fecha_emision).toLocaleDateString("es-CO") },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between text-sm border-b border-white/[0.06] pb-2 last:border-0 last:pb-0">
                    <span className="text-neutral-400">{item.label}</span>
                    <span className="font-bold text-white">{item.value}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setEmitiendo(false)} className="w-full bg-white hover:bg-neutral-100 text-black font-extrabold py-3.5 rounded-2xl text-sm transition active:scale-[0.98]">
                Ver mis tarjetas
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lista de tarjetas */}
      {!emitiendo && (
        <>
          {errorCongelar && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-3 text-red-400">
              <AlertCircle size={18} /> <p className="text-sm font-semibold">{errorCongelar}</p>
            </div>
          )}

          {tarjetas.length === 0 ? (
            <div className="apple-glass-card rounded-3xl p-16 text-center space-y-4">
              <div className="inline-flex p-5 rounded-3xl bg-white/[0.04] border border-white/[0.08]">
                <CreditCard size={40} className="text-neutral-600" />
              </div>
              <h2 className="text-lg font-extrabold text-white">Aún no tienes tarjetas</h2>
              <p className="text-sm text-neutral-500">Usa el botón "Solicitar Tarjeta" para emitir la tuya.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tarjetas.map((tarjeta) => {
                const cuenta = cuentas.find((c) => c.id_cuenta === tarjeta.id_cuenta);
                const verNumero = mostrarNumero[tarjeta.id_tarjeta];
                const numeroCargando = cargandoNumero[tarjeta.id_tarjeta];
                const numeroCompleto = numerosRevelados[tarjeta.id_tarjeta];
                const congelada = tarjeta.estado === "congelada";

                return (
                  <div key={tarjeta.id_tarjeta} className="space-y-0 rounded-3xl overflow-hidden">
                    {/* Cara de la tarjeta */}
                    <div className={`relative text-white p-7 rounded-3xl overflow-hidden select-none ${congelada ? "bg-gradient-to-br from-neutral-700 to-neutral-900" : tarjeta.estado === "activa" ? "bg-gradient-to-br from-neutral-800 to-neutral-950" : "bg-gradient-to-br from-neutral-700 to-neutral-900"}`}>
                      <div className="absolute inset-0 titanium-shimmer pointer-events-none" />
                      <div className="absolute top-0 right-0 bottom-0 w-40 bg-white/[0.03] rounded-full translate-x-16" />

                      <div className="flex justify-between items-start mb-8 relative z-10">
                        <div>
                          <p className="font-extrabold tracking-tight text-white text-base">BankLite</p>
                          <p className="text-[10px] text-white/50 mt-0.5 uppercase tracking-widest capitalize">{tarjeta.tipo_tarjeta}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-8 rounded bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 shadow-inner" />
                          <span className="text-white/40 text-sm font-bold">))</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mb-6 relative z-10">
                        <p className="text-xl font-mono font-bold tracking-[0.15em] flex-1 text-white/90">
                          {verNumero && numeroCompleto ? numeroCompleto : maskNumeroTarjeta(tarjeta.numero_tarjeta)}
                        </p>
                        <button onClick={() => toggleNumero(tarjeta.id_tarjeta)} disabled={numeroCargando}
                          className="bg-white/10 hover:bg-white/20 rounded-xl p-2 transition flex-shrink-0">
                          {numeroCargando ? <Loader2 size={16} className="animate-spin" /> : verNumero ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      <div className="flex justify-between items-end relative z-10">
                        <div>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">Titular</p>
                          <p className="font-bold uppercase tracking-wide text-sm text-white">{titular || "TITULAR"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">Cuenta</p>
                          <p className="text-xs text-white/70 font-mono">{maskNumeroCuenta(cuenta?.numero_cuenta)}</p>
                        </div>
                      </div>

                      {congelada && (
                        <div className="absolute inset-0 rounded-3xl bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                          <Lock size={36} className="text-white" />
                          <p className="font-bold text-white text-sm">Tarjeta congelada</p>
                        </div>
                      )}
                    </div>

                    {/* Panel de control */}
                    <div className="apple-glass rounded-b-3xl px-5 py-4 border-t border-white/[0.06] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {tarjeta.estado === "activa" ? (
                            <CheckCircle size={16} className="text-emerald-400" />
                          ) : (
                            <Lock size={16} className="text-neutral-500" />
                          )}
                          <span className={`text-sm font-bold ${tarjeta.estado === "activa" ? "text-emerald-400" : congelada ? "text-neutral-400" : "text-neutral-500"}`}>
                            {tarjeta.estado === "activa" ? "Activa" : congelada ? "Congelada" : tarjeta.estado}
                          </span>
                        </div>
                        <span className="text-[11px] text-neutral-500 font-semibold">{tipoLabel(tarjeta.tipo_tarjeta)}</span>
                      </div>

                      {tarjeta.estado !== "vencida" && (
                        <button onClick={() => handleToggleFreeze(tarjeta.id_tarjeta)} disabled={congelando[tarjeta.id_tarjeta]}
                          className={`w-full flex items-center justify-center gap-2 font-bold py-2.5 rounded-xl text-sm transition disabled:opacity-50 ${congelada ? "bg-white/10 hover:bg-white/15 text-white" : "border border-white/[0.12] hover:border-white/25 text-neutral-300 hover:text-white"}`}>
                          {congelando[tarjeta.id_tarjeta] ? <Loader2 size={16} className="animate-spin" /> : congelada ? <Sun size={16} /> : <Snowflake size={16} />}
                          {congelada ? "Descongelar tarjeta" : "Congelar tarjeta"}
                        </button>
                      )}

                      {verNumero && (
                        <p className="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
                          <Eye size={12} /> Número visible — pulsa el ojo para ocultar
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
