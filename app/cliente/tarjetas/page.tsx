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
  // numerosRevelados: guarda el número COMPLETO ya obtenido del backend por tarjeta id
  const [numerosRevelados, setNumerosRevelados] = useState<Record<string, string>>({});
  // mostrarNumero: controla si se muestra o no (el ojo)
  const [mostrarNumero, setMostrarNumero] = useState<Record<string, boolean>>({});
  // cargandoNumero: spinner mientras trae el número del backend
  const [cargandoNumero, setCargandoNumero] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [congelando, setCongelando] = useState<Record<string, boolean>>({});
  const [errorCongelar, setErrorCongelar] = useState<string | null>(null);

  // Flujo de emisión
  const [emitiendo, setEmitiendo] = useState(false);
  const [solicitando, setSolicitando] = useState(false);
  const [resultadoEmision, setResultadoEmision] = useState<Tarjeta | null>(null);
  const [errorEmision, setErrorEmision] = useState<string | null>(null);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState("");
  const [tipoSeleccionado, setTipoSeleccionado] = useState<"virtual" | "fisica">("virtual");

  const sesion = obtenerSesion();
  const titular = sesion
    ? [sesion.usuario.nombre, sesion.usuario.apellido].filter(Boolean).join(" ").toUpperCase()
    : "";

  useEffect(() => {
    async function cargar() {
      try {
        if (!sesion) return;
        const [tarjetasResult, cuentasResult] = await Promise.allSettled([
          listCards(),
          listAccounts(),
        ]);

        const todasLasCuentas =
          cuentasResult.status === "fulfilled" ? cuentasResult.value : [];
        const todasLasTarjetas =
          tarjetasResult.status === "fulfilled" ? tarjetasResult.value : [];

        if (cuentasResult.status === "rejected") {
          setError(
            "No pudimos cargar sus cuentas. Es posible que el servicio esté temporalmente no disponible. Intente más tarde."
          );
          setLoading(false);
          return;
        }

        const misCuentas = todasLasCuentas.filter(
          (cu) => cu.id_usuario === sesion.usuario.id_usuario
        );
        const misCuentaIds = new Set(misCuentas.map((cu) => cu.id_cuenta));
        setTarjetas(todasLasTarjetas.filter((ta) => misCuentaIds.has(ta.id_cuenta)));
        setCuentas(misCuentas);
        const primeraActiva = misCuentas.find((c) => c.estado === "activa");
        if (primeraActiva) setCuentaSeleccionada(primeraActiva.id_cuenta);
      } catch {
        setError("Error inesperado al cargar sus datos. Intente nuevamente.");
      } finally {
        setLoading(false);
      }
    }
    cargar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Al pulsar el ojito:
   * - Si ya está mostrando → ocultar (solo cambia estado visual, NO descarta el número cacheado)
   * - Si está oculto y ya tenemos el número cacheado → mostrar directamente
   * - Si está oculto y NO tenemos el número → llamar al backend (endpoint seguro) y mostrar
   */
  async function toggleNumero(tarjetaId: string) {
    const yaVisible = mostrarNumero[tarjetaId];

    if (yaVisible) {
      // Ocultar
      setMostrarNumero((prev) => ({ ...prev, [tarjetaId]: false }));
      return;
    }

    // Si ya lo tenemos cacheado, solo mostrar
    if (numerosRevelados[tarjetaId]) {
      setMostrarNumero((prev) => ({ ...prev, [tarjetaId]: true }));
      return;
    }

    // Pedir al backend
    if (!sesion) return;
    setCargandoNumero((prev) => ({ ...prev, [tarjetaId]: true }));
    try {
      const resultado = await revelarNumeroTarjeta(tarjetaId, sesion.usuario.id_usuario);
      setNumerosRevelados((prev) => ({ ...prev, [tarjetaId]: resultado.numero_formateado }));
      setMostrarNumero((prev) => ({ ...prev, [tarjetaId]: true }));
    } catch {
      // Si falla, no mostramos nada — el número permanece enmascarado
    } finally {
      setCargandoNumero((prev) => ({ ...prev, [tarjetaId]: false }));
    }
  }

  async function handleToggleFreeze(tarjetaId: string) {
    if (congelando[tarjetaId]) return;
    setCongelando((prev) => ({ ...prev, [tarjetaId]: true }));
    setErrorCongelar(null);
    try {
      const actualizada = await toggleFreezeCard(tarjetaId);
      setTarjetas((prev) =>
        prev.map((t) => (t.id_tarjeta === tarjetaId ? { ...t, ...actualizada, numero_tarjeta: actualizada.numero_tarjeta ?? t.numero_tarjeta } : t))
      );
    } catch (err: unknown) {
      setErrorCongelar(err instanceof Error ? err.message : "No fue posible cambiar el estado de la tarjeta");
    } finally {
      setCongelando((prev) => ({ ...prev, [tarjetaId]: false }));
    }
  }

  async function handleSolicitarTarjeta() {
    if (!sesion || !cuentaSeleccionada || solicitando) return;
    setSolicitando(true);
    setErrorEmision(null);
    setResultadoEmision(null);
    try {
      const tarjeta = await solicitarTarjetaCliente({
        id_usuario: sesion.usuario.id_usuario,
        id_cuenta: cuentaSeleccionada,
        tipo_tarjeta: tipoSeleccionado,
      });
      setResultadoEmision(tarjeta);
      // Actualizar la lista
      const [t] = await Promise.all([listCards()]);
      const misCuentaIds = new Set(cuentas.map((cu) => cu.id_cuenta));
      setTarjetas(t.filter((ta) => misCuentaIds.has(ta.id_cuenta)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "No fue posible emitir la tarjeta";
      setErrorEmision(msg);
    } finally {
      setSolicitando(false);
    }
  }

  if (loading)
    return (
      <div className="space-y-6 pb-10">
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <div className="animate-pulse h-14 w-14 bg-slate-200 rounded-2xl" />
          <div className="animate-pulse space-y-2 flex-1">
            <div className="h-6 bg-slate-200 rounded w-1/3" />
            <div className="h-4 bg-slate-200 rounded w-1/2" />
          </div>
        </div>
        {/* Card skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-3xl overflow-hidden">
              <div className="bg-slate-200 h-52 rounded-2xl" />
              <div className="bg-white border border-slate-100 rounded-b-3xl p-5 space-y-3">
                <div className="h-4 bg-slate-200 rounded w-2/3" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
                <div className="h-10 bg-slate-200 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );

  if (error)
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 flex items-center gap-4">
        <AlertCircle size={32} className="text-red-500 flex-shrink-0" />
        <p className="text-red-800 text-lg font-semibold">{error}</p>
      </div>
    );

  const estadoUsuario = sesion?.usuario.estado;
  const cuentasActivas = cuentas.filter((c) => c.estado === "activa");

  return (
    <div className="space-y-6 pb-10">
      {/* Encabezado */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-brand-100 p-3 rounded-2xl text-brand-600">
            <CreditCard size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800">Mis Tarjetas</h1>
            <p className="text-lg text-slate-500">Administra tus tarjetas bancarias.</p>
          </div>
        </div>
        {!emitiendo && (
          <button
            onClick={() => { setEmitiendo(true); setResultadoEmision(null); setErrorEmision(null); }}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-5 py-3 rounded-2xl shadow-lg transition-colors text-base"
          >
            <Plus size={20} /> Solicitar Tarjeta
          </button>
        )}
      </div>

      {/* Panel de solicitud */}
      {emitiendo && (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 space-y-6">
          <h2 className="text-2xl font-black text-slate-800">Solicitar Nueva Tarjeta</h2>

          {estadoUsuario !== "verificado" && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 flex gap-3">
              <ShieldX size={28} className="text-amber-500 flex-shrink-0" />
              <div>
                <p className="font-bold text-amber-800 text-lg">Identidad no verificada</p>
                <p className="text-amber-700 mt-1">
                  No puedes solicitar una tarjeta hasta completar la verificación de identidad.
                  Esto se hace automáticamente al registrarse con tu cédula.
                </p>
              </div>
            </div>
          )}

          {estadoUsuario === "verificado" && cuentasActivas.length === 0 && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 flex gap-3">
              <AlertCircle size={28} className="text-amber-500 flex-shrink-0" />
              <div>
                <p className="font-bold text-amber-800 text-lg">Sin cuenta activa</p>
                <p className="text-amber-700 mt-1">
                  Necesitas tener una cuenta bancaria activa para solicitar una tarjeta.
                  Contacta al administrador para abrir tu cuenta.
                </p>
              </div>
            </div>
          )}

          {estadoUsuario === "verificado" && cuentasActivas.length > 0 && !resultadoEmision && (
            <div className="space-y-5">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-2 items-center">
                <ShieldCheck size={20} className="text-green-600 flex-shrink-0" />
                <p className="text-green-800 font-semibold text-sm">
                  Tu identidad está verificada. Puedes emitir tu tarjeta.
                </p>
              </div>

              <div>
                <label className="block text-base font-bold text-slate-700 mb-2">
                  Cuenta bancaria asociada
                </label>
                <select
                  value={cuentaSeleccionada}
                  onChange={(e) => setCuentaSeleccionada(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base focus:border-brand-600 focus:outline-none"
                >
                  {cuentasActivas.map((c) => (
                    <option key={c.id_cuenta} value={c.id_cuenta}>
                      {c.tipo_cuenta.charAt(0).toUpperCase() + c.tipo_cuenta.slice(1)} —{" "}
                      {maskNumeroCuenta(c.numero_cuenta)} · {c.moneda}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-base font-bold text-slate-700 mb-2">
                  Tipo de tarjeta
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(["virtual", "fisica"] as const).map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setTipoSeleccionado(tipo)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        tipoSeleccionado === tipo
                          ? "border-brand-600 bg-brand-50"
                          : "border-slate-200 hover:border-brand-500"
                      }`}
                    >
                      <p className="font-bold text-slate-800 capitalize">{tipo}</p>
                      <p className="text-sm text-slate-500 mt-1">
                        {tipo === "virtual"
                          ? "Para compras en línea y pagos digitales"
                          : "Tarjeta física con chip y contactless"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {errorEmision && (
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex gap-3 text-red-800">
                  <AlertCircle size={22} className="flex-shrink-0" />
                  <p className="font-semibold">{errorEmision}</p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setEmitiendo(false)}
                  className="flex-1 border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold py-3 rounded-2xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSolicitarTarjeta}
                  disabled={solicitando || !cuentaSeleccionada}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 text-lg shadow-lg transition-colors"
                >
                  {solicitando ? <Loader2 size={22} className="animate-spin" /> : <Plus size={22} />}
                  {solicitando ? "Emitiendo…" : "Emitir Tarjeta"}
                </button>
              </div>
            </div>
          )}

          {/* Resultado exitoso */}
          {resultadoEmision && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle size={72} className="text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-black text-green-700">¡Tarjeta emitida correctamente!</h3>
              </div>
              <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 space-y-3">
                {[
                  { label: "Número de tarjeta", value: maskNumeroTarjeta(resultadoEmision.numero_tarjeta) },
                  { label: "Tipo", value: resultadoEmision.tipo_tarjeta.charAt(0).toUpperCase() + resultadoEmision.tipo_tarjeta.slice(1) },
                  { label: "Estado", value: "✅ ACTIVA" },
                  {
                    label: "Cuenta asociada",
                    value: maskNumeroCuenta(
                      cuentas.find((c) => c.id_cuenta === resultadoEmision.id_cuenta)?.numero_cuenta
                    ),
                  },
                  {
                    label: "Fecha de emisión",
                    value: new Date(resultadoEmision.fecha_emision).toLocaleDateString("es-CO"),
                  },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center border-b border-green-200 pb-3 last:border-0 last:pb-0">
                    <span className="text-green-700 font-semibold">{item.label}</span>
                    <span className="font-bold text-green-900">{item.value}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-500 text-center">
                Ve a &quot;Mis Tarjetas&quot; y pulsa el ojo 👁 para ver el número completo.
              </p>
              <button
                onClick={() => setEmitiendo(false)}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-2xl text-lg"
              >
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
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex gap-3 text-red-800">
              <AlertCircle size={22} className="flex-shrink-0" />
              <p className="font-semibold">{errorCongelar}</p>
            </div>
          )}
          {tarjetas.length === 0 ? (
            <div className="text-center py-16">
              <CreditCard size={64} className="mx-auto text-slate-300 mb-4" />
              <h2 className="text-2xl font-bold text-slate-600">Aún no tienes tarjetas</h2>
              <p className="text-slate-500 mt-2 text-lg">
                Usa el botón &quot;Solicitar Tarjeta&quot; para emitir la tuya.
              </p>
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
                  <div key={tarjeta.id_tarjeta} className="rounded-3xl overflow-hidden shadow-xl">
                    <div
                      className={`relative text-white p-7 rounded-2xl bg-gradient-to-br ${
                        congelada
                          ? "from-gray-400 to-gray-600"
                          : tarjeta.estado === "activa"
                            ? "from-brand-500 via-brand-600 to-brand-900"
                            : "from-gray-500 to-gray-700"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <p className="text-white/80 text-sm font-semibold uppercase tracking-widest">BankLite</p>
                          <p className="text-xs text-white/60 mt-1 capitalize">{tarjeta.tipo_tarjeta}</p>
                        </div>
                        <CreditCard size={36} className="text-white/60" />
                      </div>
                      <div className="flex items-center gap-3 mb-6">
                        <p className="text-2xl font-mono font-bold tracking-widest flex-1">
                          {verNumero && numeroCompleto
                            ? numeroCompleto
                            : maskNumeroTarjeta(tarjeta.numero_tarjeta)}
                        </p>
                        <button
                          onClick={() => toggleNumero(tarjeta.id_tarjeta)}
                          className="bg-white/20 hover:bg-white/30 rounded-lg p-2 transition-colors flex-shrink-0"
                          title={verNumero ? "Ocultar número" : "Ver número completo"}
                          disabled={numeroCargando}
                        >
                          {numeroCargando
                            ? <Loader2 size={18} className="animate-spin" />
                            : verNumero
                              ? <EyeOff size={18} />
                              : <Eye size={18} />
                          }
                        </button>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="font-bold uppercase tracking-wide">{titular || "TITULAR"}</p>
                          <p className="text-white/80 text-sm mt-1">
                            Estado: {congelada ? "Congelada" : tarjeta.estado.charAt(0).toUpperCase() + tarjeta.estado.slice(1)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold uppercase">{tipoLabel(tarjeta.tipo_tarjeta)}</p>
                          <p className="text-white/70 text-xs mt-1">
                            Cuenta {maskNumeroCuenta(cuenta?.numero_cuenta)}
                          </p>
                        </div>
                      </div>
                      {congelada && (
                        <div className="absolute inset-0 rounded-2xl bg-black/35 flex flex-col items-center justify-center gap-2">
                          <Lock size={48} className="text-white" />
                          <p className="font-bold text-white">Tarjeta congelada</p>
                        </div>
                      )}
                    </div>
                    <div className="bg-white p-5 border border-slate-100 rounded-b-3xl space-y-3">
                      <div className="flex items-center gap-2">
                        {tarjeta.estado === "activa" ? (
                          <CheckCircle size={22} className="text-brand-500" />
                        ) : (
                          <Lock size={22} className="text-red-400" />
                        )}
                        <span
                          className={`text-lg font-bold ${
                            tarjeta.estado === "activa" ? "text-brand-700" : "text-red-600"
                          }`}
                        >
                          {tarjeta.estado === "activa"
                            ? "Tarjeta Activa"
                            : congelada
                              ? "Tarjeta Congelada"
                              : "Tarjeta " + tarjeta.estado}
                        </span>
                      </div>
                      <p className="text-slate-500 text-sm">
                        Procesador: <span className="font-bold text-slate-700">{tarjeta.procesador_externo}</span>
                      </p>
                      {tarjeta.estado !== "vencida" && (
                        <button
                          onClick={() => handleToggleFreeze(tarjeta.id_tarjeta)}
                          disabled={congelando[tarjeta.id_tarjeta]}
                          className={`w-full flex items-center justify-center gap-2 font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50 ${
                            congelada
                              ? "bg-brand-600 hover:bg-brand-700 text-white"
                              : "border-2 border-brand-500 text-brand-700 hover:bg-brand-50"
                          }`}
                        >
                          {congelando[tarjeta.id_tarjeta] ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : congelada ? (
                            <Sun size={18} />
                          ) : (
                            <Snowflake size={18} />
                          )}
                          {congelada ? "Descongelar tarjeta" : "Congelar tarjeta"}
                        </button>
                      )}
                      {verNumero && (
                        <p className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                          Número visible — pulsa el ojo para ocultar
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
