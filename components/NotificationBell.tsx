"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, ArrowUpRight, ArrowDownLeft, ShieldAlert } from "lucide-react";
import { Notificacion, listNotificaciones, marcarNotificacionLeida, marcarTodasLeidas } from "@/lib/api";

function icono(tipo: string) {
  if (tipo === "transferencia_recibida") return <ArrowDownLeft size={16} className="text-emerald-600" />;
  if (tipo === "fraude_bloqueo") return <ShieldAlert size={16} className="text-red-600" />;
  return <ArrowUpRight size={16} className="text-sky-600" />;
}

function hace(fecha: string) {
  const s = Math.max(0, (Date.now() - new Date(fecha).getTime()) / 1000);
  if (s < 60) return "Hace un momento";
  if (s < 3600) return `Hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `Hace ${Math.floor(s / 3600)} h`;
  return new Date(fecha).toLocaleDateString("es-CO");
}

/** Campana de avisos: consulta notification-service cada 30 s. */
export function NotificationBell({ idUsuario }: { idUsuario: string }) {
  const [items, setItems] = useState<Notificacion[]>([]);
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async () => {
    try {
      setItems(await listNotificaciones(idUsuario));
    } catch {
      /* notification-service puede estar dormido: no molestamos al usuario */
    }
  }, [idUsuario]);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 30000);
    return () => clearInterval(t);
  }, [cargar]);

  useEffect(() => {
    function fuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  const noLeidas = items.filter((n) => !n.leida).length;

  async function leer(n: Notificacion) {
    if (n.leida) return;
    setItems((prev) => prev.map((x) => (x.id_notificacion === n.id_notificacion ? { ...x, leida: true } : x)));
    try {
      await marcarNotificacionLeida(n.id_notificacion);
    } catch {
      /* se reintenta en la próxima carga */
    }
  }

  async function leerTodas() {
    setItems((prev) => prev.map((x) => ({ ...x, leida: true })));
    try {
      await marcarTodasLeidas(idUsuario);
    } catch {
      /* idem */
    }
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
        className="relative h-11 w-11 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600"
      >
        <Bell size={20} />
        {noLeidas > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <p className="font-bold text-slate-800">Notificaciones</p>
            {noLeidas > 0 && (
              <button onClick={leerTodas} className="text-xs font-semibold text-indigo-600 hover:underline">
                Marcar todas como leídas
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {items.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-400">Aún no tienes notificaciones.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id_notificacion}
                  onClick={() => leer(n)}
                  className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-slate-50 ${n.leida ? "" : "bg-indigo-50/60"}`}
                >
                  <div className="mt-0.5 h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                    {icono(n.tipo)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800">{n.titulo}</p>
                    <p className="text-xs text-slate-600 mt-0.5 break-words">{n.mensaje}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{hace(n.fecha)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
