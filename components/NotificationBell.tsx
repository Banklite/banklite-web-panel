"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, ArrowUpRight, ArrowDownLeft, ShieldAlert, Sparkles, Check, RefreshCw } from "lucide-react";
import { Notificacion, listNotificaciones, marcarNotificacionLeida, marcarTodasLeidas } from "@/lib/api";

function icono(tipo: string) {
  if (tipo === "transferencia_recibida") {
    return <ArrowDownLeft size={15} className="text-emerald-400" />;
  }
  if (tipo === "fraude_bloqueo" || tipo === "alerta") {
    return <ShieldAlert size={15} className="text-rose-400" />;
  }
  if (tipo === "seguridad") {
    return <Sparkles size={15} className="text-amber-400" />;
  }
  return <ArrowUpRight size={15} className="text-sky-400" />;
}

function hace(fecha: string) {
  const s = Math.max(0, (Date.now() - new Date(fecha).getTime()) / 1000);
  if (s < 60) return "Ahora";
  if (s < 3600) return `Hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `Hace ${Math.floor(s / 3600)} h`;
  return new Date(fecha).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

/** Campana de notificaciones Apple Glassmorphic */
export function NotificationBell({ idUsuario }: { idUsuario: string }) {
  const [items, setItems] = useState<Notificacion[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async () => {
    if (!idUsuario) return;
    try {
      const res = await listNotificaciones(idUsuario);
      setItems(res);
    } catch {
      // Silencioso si el servicio está en reposo
    }
  }, [idUsuario]);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 15000);
    return () => clearInterval(t);
  }, [cargar]);

  useEffect(() => {
    function fuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  const noLeidas = items.filter((n) => !n.leida).length;

  async function leer(n: Notificacion) {
    if (n.leida) return;
    setItems((prev) =>
      prev.map((x) => (x.id_notificacion === n.id_notificacion ? { ...x, leida: true } : x))
    );
    try {
      await marcarNotificacionLeida(n.id_notificacion);
    } catch {
      // Reintentar en siguiente ciclo
    }
  }

  async function leerTodas() {
    setItems((prev) => prev.map((x) => ({ ...x, leida: true })));
    try {
      await marcarTodasLeidas(idUsuario);
    } catch {
      // Silencioso
    }
  }

  async function recargarManual() {
    setCargando(true);
    await cargar();
    setCargando(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setAbierto((v) => !v);
          if (!abierto) cargar();
        }}
        aria-label="Notificaciones"
        className="relative h-9 w-9 rounded-full bg-white/[0.06] border border-white/[0.12] hover:bg-white/[0.12] hover:border-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-all active:scale-95 shadow-sm"
      >
        <Bell size={17} />
        {noLeidas > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-lg shadow-rose-500/50 animate-pulse">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 max-w-[92vw] bg-neutral-950/95 backdrop-blur-3xl rounded-3xl border border-white/[0.15] shadow-2xl z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-white tracking-tight">Notificaciones</span>
              {noLeidas > 0 && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
                  {noLeidas} nuevas
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={recargarManual}
                disabled={cargando}
                title="Actualizar"
                className="text-neutral-400 hover:text-white p-1 rounded-lg transition"
              >
                <RefreshCw size={13} className={cargando ? "animate-spin" : ""} />
              </button>
              {noLeidas > 0 && (
                <button
                  onClick={leerTodas}
                  className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1"
                >
                  <Check size={12} /> Marcar leídas
                </button>
              )}
            </div>
          </div>

          {/* Listado */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-white/[0.06] scrollbar-thin">
            {items.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="h-10 w-10 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-neutral-500 flex items-center justify-center mx-auto">
                  <Bell size={18} />
                </div>
                <p className="text-xs font-semibold text-neutral-400">Sin notificaciones por ahora</p>
                <p className="text-[10px] text-neutral-600">Te avisaremos sobre tus transferencias y accesos.</p>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id_notificacion}
                  onClick={() => leer(n)}
                  className={`w-full text-left px-5 py-3.5 flex gap-3.5 hover:bg-white/[0.04] transition-all ${
                    n.leida ? "opacity-60" : "bg-white/[0.02]"
                  }`}
                >
                  <div className="mt-0.5 h-8 w-8 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center flex-shrink-0">
                    {icono(n.tipo)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-white truncate">{n.titulo}</p>
                      <span className="text-[10px] text-neutral-500 font-mono whitespace-nowrap">
                        {hace(n.fecha)}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-300 mt-0.5 leading-relaxed break-words">
                      {n.mensaje}
                    </p>
                  </div>
                  {!n.leida && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 self-center" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
