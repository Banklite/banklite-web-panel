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
      <Loader2 size={40} className="text-sky-600 animate-spin" />
      <p className="text-sm text-slate-500 font-semibold">Cargando tus tarjetas…</p>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-8 flex items-center gap-4">
      <AlertCircle size={28} className="text-red-600 flex-shrink-0" />
      <p className="text-red-600 font-semibold">{error}</p>
    </div>
  );

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="apple-icon-badge h-12 w-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/20">
            <CreditCard size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-950 tracking-tight">Mis Tarjetas</h1>
            <p className="text-xs text-slate-500 font-medium">Gestiona y controla tus tarjetas bancarias</p>
          </div>
        </div>
        {!emitiendo && (
          <button onClick={() => { setEmitiendo(true); setResultadoEmision(null); setErrorEmision(null); }}
            className="flex items-center gap-2 apple-glass-button rounded-2xl px-5 py-2.5 text-xs font-black text-slate-800 hover:text-slate-950 transition-all duration-200 active:scale-[0.97] hover:scale-[1.02] shadow-sm">
            <Plus size={16} /> Solicitar Tarjeta
          </button>
        )}
      </div>

      {/* Panel de solicitud */}
      {emitiendo && (
        <div className="apple-glass-card rounded-[32px] p-6 sm:p-8 space-y-5 border border-white/95 shadow-xl">
          <h2 className="text-base font-black text-slate-950">Solicitar Nueva Tarjeta</h2>

          {estadoUsuario !== "verificado" && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-3 shadow-xs">
              <ShieldX size={24} className="text-amber-700 flex-shrink-0" />
              <div>
                <p className="font-bold text-amber-800 text-sm">Identidad no verificada</p>
                <p className="text-xs text-slate-600 mt-1">No puedes solicitar una tarjeta hasta completar la verificación de identidad con tu cédula.</p>
              </div>
            </div>
          )}

          {estadoUsuario === "verificado" && cuentasActivas.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-3 shadow-xs">
              <AlertCircle size={24} className="text-amber-700 flex-shrink-0" />
              <div>
                <p className="font-bold text-amber-800 text-sm">Sin cuenta activa</p>
                <p className="text-xs text-slate-600 mt-1">Necesitas una cuenta activa para solicitar una tarjeta. Contacta al administrador.</p>
              </div>
            </div>
          )}

          {estadoUsuario === "verificado" && cuentasActivas.length > 0 && !resultadoEmision && (
            <div className="space-y-5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex gap-2 items-center shadow-xs">
                <ShieldCheck size={18} className="text-emerald-600 flex-shrink-0" />
                <p className="text-emerald-700 text-xs font-bold">Identidad verificada. Puedes emitir tu tarjeta.</p>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-600 mb-2">Cuenta bancaria asociada</label>
                <select value={cuentaSeleccionada} onChange={(e) => setCuentaSeleccionada(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-3.5 text-sm text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white transition appearance-none shadow-sm font-medium">
                  {cuentasActivas.map((c) => (
                    <option key={c.id_cuenta} value={c.id_cuenta}>{c.tipo_cuenta.charAt(0).toUpperCase() + c.tipo_cuenta.slice(1)} — {maskNumeroCuenta(c.numero_cuenta)} · {c.moneda}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-600 mb-2">Tipo de tarjeta</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["virtual", "fisica"] as const).map((tipo) => (
                    <button key={tipo} type="button" onClick={() => setTipoSeleccionado(tipo)}
                      className={`p-4 rounded-2xl border text-left transition-all duration-200 active:scale-[0.98] ${tipoSeleccionado === tipo ? "border-sky-500 bg-sky-50/70 shadow-sm ring-2 ring-sky-500/20" : "border-slate-200/80 hover:border-slate-300 bg-white/80 shadow-xs"}`}>
                      <p className="font-black text-slate-950 capitalize text-sm">{tipo}</p>
                      <p className="text-xs text-slate-500 mt-1 font-medium">{tipo === "virtual" ? "Para compras en línea y pagos digitales" : "Tarjeta física con chip y contactless"}</p>
                    </button>
                  ))}
                </div>
              </div>

              {errorEmision && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 text-red-600 animate-fade-in shadow-xs">
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <p className="text-xs font-semibold">{errorEmision}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setEmitiendo(false)} className="flex-1 apple-glass-button text-slate-700 hover:text-slate-950 font-black py-3.5 rounded-2xl text-xs transition-all duration-200 active:scale-[0.97] hover:scale-[1.02]">Cancelar</button>
                <button onClick={handleSolicitarTarjeta} disabled={solicitando || !cuentaSeleccionada}
                  className="flex-1 apple-primary-button disabled:opacity-40 font-black py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97] hover:scale-[1.02] shadow-md shadow-sky-500/25">
                  {solicitando ? <Loader2 size={16} className="animate-spin text-white" /> : <Plus size={16} />}
                  <span>{solicitando ? "Emitiendo…" : "Emitir Tarjeta"}</span>
                </button>
              </div>
            </div>
          )}

          {resultadoEmision && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="inline-flex p-4 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-sm">
                  <CheckCircle size={40} />
                </div>
                <h3 className="text-lg font-black text-slate-950">¡Tarjeta emitida correctamente!</h3>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-xs">
                {[
                  { label: "Número de tarjeta", value: maskNumeroTarjeta(resultadoEmision.numero_tarjeta) },
                  { label: "Tipo", value: resultadoEmision.tipo_tarjeta.charAt(0).toUpperCase() + resultadoEmision.tipo_tarjeta.slice(1) },
                  { label: "Estado", value: "Activa" },
                  { label: "Fecha de emisión", value: new Date(resultadoEmision.fecha_emision).toLocaleDateString("es-CO") },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between text-xs sm:text-sm border-b border-slate-200/70 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-500 font-medium">{item.label}</span>
                    <span className="font-black text-slate-950">{item.value}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setEmitiendo(false)} className="w-full apple-primary-button font-black py-3.5 rounded-2xl text-xs sm:text-sm transition-all duration-200 active:scale-[0.97] hover:scale-[1.02] shadow-lg shadow-sky-500/25">
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
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 text-red-600">
              <AlertCircle size={18} /> <p className="text-sm font-semibold">{errorCongelar}</p>
            </div>
          )}

          {tarjetas.length === 0 ? (
            <div className="apple-glass-card rounded-3xl p-16 text-center space-y-4">
              <div className="inline-flex p-5 rounded-3xl bg-slate-50 border border-slate-200/80">
                <CreditCard size={40} className="text-slate-400" />
              </div>
              <h2 className="text-lg font-extrabold text-slate-900">Aún no tienes tarjetas</h2>
              <p className="text-sm text-slate-500">Usa el botón "Solicitar Tarjeta" para emitir la tuya.</p>
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
                  <div key={tarjeta.id_tarjeta} className="space-y-0 rounded-[32px] overflow-hidden shadow-lg border border-white/95 apple-spring">
                    {/* Cara de la tarjeta */}
                    <div className={`relative p-7 sm:p-8 rounded-[32px] overflow-hidden select-none transition-all duration-300 ${
                      congelada
                        ? "bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 text-slate-500"
                        : "apple-white-titanium text-slate-900"
                    }`}>
                      <div className="absolute inset-0 titanium-shimmer pointer-events-none" />
                      <div className="absolute top-0 right-0 bottom-0 w-44 bg-gradient-to-bl from-sky-400/10 via-cyan-400/5 to-transparent rounded-full translate-x-12 pointer-events-none" />

                      {/* Header de la tarjeta con chip EMV dorado */}
                      <div className="flex justify-between items-start mb-9 relative z-10">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black tracking-tight text-slate-950 text-xl font-sans">BankLite</span>
                            <span className="text-[9px] font-black uppercase tracking-widest bg-slate-900/10 text-slate-700 px-2 py-0.5 rounded-full">
                              Titanium
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-widest font-bold">
                            {tarjeta.tipo_tarjeta === "virtual" ? "Tarjeta Digital" : "Tarjeta Física Contactless"}
                          </p>
                        </div>

                        {/* Chip EMV Dorado con Contactless */}
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-11 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border border-amber-300/80 shadow-inner flex flex-col justify-around p-1 relative overflow-hidden">
                            <div className="w-full h-px bg-amber-700/30" />
                            <div className="w-full h-px bg-amber-700/30" />
                            <div className="absolute inset-x-2 inset-y-1 border border-amber-700/25 rounded-xs" />
                          </div>
                          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 16.5a5 5 0 010-9M12 19a9 9 0 000-14M15.5 21.5a13 13 0 000-19" />
                          </svg>
                        </div>
                      </div>

                      {/* Número de Tarjeta */}
                      <div className="flex items-center gap-3 mb-8 relative z-10">
                        <p className="text-xl sm:text-2xl font-mono font-black tracking-[0.16em] flex-1 text-slate-900 drop-shadow-xs">
                          {verNumero && numeroCompleto ? numeroCompleto : maskNumeroTarjeta(tarjeta.numero_tarjeta)}
                        </p>
                        <button
                          onClick={() => toggleNumero(tarjeta.id_tarjeta)}
                          disabled={numeroCargando}
                          className="apple-glass hover:bg-white rounded-xl p-2.5 transition-all duration-200 flex-shrink-0 text-slate-700 hover:text-slate-950 border border-slate-200 shadow-xs active:scale-90 hover:scale-110"
                          title={verNumero ? "Ocultar número" : "Ver número completo"}
                        >
                          {numeroCargando ? <Loader2 size={16} className="animate-spin text-sky-600" /> : verNumero ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      {/* Titular y Logo Mastercard */}
                      <div className="flex justify-between items-end relative z-10">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-0.5">Titular</p>
                          <p className="font-black uppercase tracking-wide text-sm text-slate-900">{titular || "TITULAR BANKLITE"}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5 font-medium">Cuenta: {maskNumeroCuenta(cuenta?.numero_cuenta)}</p>
                        </div>

                        {/* Mastercard Logo en Cristal */}
                        <div className="flex items-center -space-x-3 opacity-90">
                          <div className="w-8 h-8 rounded-full bg-red-500/85 shadow-sm" />
                          <div className="w-8 h-8 rounded-full bg-amber-400/85 shadow-sm" />
                        </div>
                      </div>

                      {/* Capa de Escarcha para Tarjeta Congelada */}
                      {congelada && (
                        <div className="absolute inset-0 rounded-[32px] apple-frost-overlay flex flex-col items-center justify-center gap-3 animate-fade-in z-20">
                          <div className="apple-icon-badge h-14 w-14 rounded-2xl bg-white/95 border border-slate-200 text-slate-800 shadow-xl">
                            <Lock size={26} />
                          </div>
                          <div className="text-center">
                            <p className="font-black text-slate-950 text-base">Tarjeta Congelada</p>
                            <p className="text-xs text-slate-500 font-medium">Bloqueada temporalmente para compras</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Panel de control */}
                    <div className="apple-glass rounded-b-3xl px-5 py-4 border-t border-slate-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {tarjeta.estado === "activa" ? (
                            <CheckCircle size={16} className="text-emerald-600" />
                          ) : (
                            <Lock size={16} className="text-slate-400" />
                          )}
                          <span className={`text-xs font-black uppercase tracking-wider ${tarjeta.estado === "activa" ? "text-emerald-600" : congelada ? "text-slate-500" : "text-slate-400"}`}>
                            {tarjeta.estado === "activa" ? "Activa" : congelada ? "Congelada" : tarjeta.estado}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-bold">{tipoLabel(tarjeta.tipo_tarjeta)}</span>
                      </div>

                      {tarjeta.estado !== "vencida" && (
                        <button onClick={() => handleToggleFreeze(tarjeta.id_tarjeta)} disabled={congelando[tarjeta.id_tarjeta]}
                          className={`w-full flex items-center justify-center gap-2 font-black py-3 rounded-2xl text-xs sm:text-sm transition-all duration-200 active:scale-[0.97] hover:scale-[1.01] disabled:opacity-50 shadow-xs ${congelada ? "apple-primary-button shadow-sky-500/25" : "apple-glass-button text-slate-700 hover:text-slate-950"}`}>
                          {congelando[tarjeta.id_tarjeta] ? <Loader2 size={16} className="animate-spin text-current" /> : congelada ? <Sun size={16} /> : <Snowflake size={16} />}
                          <span>{congelada ? "Descongelar tarjeta" : "Congelar tarjeta"}</span>
                        </button>
                      )}

                      {verNumero && (
                        <p className="text-[11px] text-amber-600 font-bold flex items-center gap-1 justify-center">
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
