"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { KeyRound, Eye, EyeOff, Copy, Check, Clock, RefreshCw, ChevronDown } from "lucide-react";
import { generarOTP } from "@/lib/api";
import Link from "next/link";

export function ClaveDinamicaWidget({ idUsuario }: { idUsuario: string }) {
  const [clave, setClave] = useState<string>("••••••");
  const [claveReal, setClaveReal] = useState<string>("");
  const [visible, setVisible] = useState<boolean>(false);
  const [segundos, setSegundos] = useState<number>(60);
  const [copiado, setCopiado] = useState<boolean>(false);
  const [cargando, setCargando] = useState<boolean>(false);
  const [abierto, setAbierto] = useState<boolean>(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const cargarNuevaClave = useCallback(async () => {
    if (!idUsuario) return;
    setCargando(true);
    try {
      const res = await generarOTP(idUsuario, "widget_header");
      const codigo = res.codigo_debug || Math.floor(100000 + Math.random() * 900000).toString();
      setClaveReal(codigo);
      setClave(codigo);
      setSegundos(60);
    } catch {
      const fallback = Math.floor(100000 + Math.random() * 900000).toString();
      setClaveReal(fallback);
      setClave(fallback);
      setSegundos(60);
    } finally {
      setCargando(false);
    }
  }, [idUsuario]);

  useEffect(() => {
    cargarNuevaClave();
  }, [cargarNuevaClave]);

  // Contador de 60 segundos con auto-recarga
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSegundos((prev) => {
        if (prev <= 1) {
          cargarNuevaClave();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cargarNuevaClave]);

  // Cerrar popover al dar clic fuera
  useEffect(() => {
    function clickFuera(e: MouseEvent) {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", clickFuera);
    return () => document.removeEventListener("mousedown", clickFuera);
  }, []);

  function handleCopiar(e: React.MouseEvent) {
    e.stopPropagation();
    if (claveReal) {
      navigator.clipboard.writeText(claveReal);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  }

  function handleToggleVisibilidad(e: React.MouseEvent) {
    e.stopPropagation();
    setVisible((v) => !v);
  }

  const claveFormateada = visible && claveReal
    ? `${claveReal.slice(0, 3)} ${claveReal.slice(3)}`
    : "••• •••";

  return (
    <div className="relative" ref={widgetRef}>
      {/* Pill estilo Nequi / Apple Titanium en la barra superior */}
      <div
        onClick={() => setAbierto((prev) => !prev)}
        className="group flex items-center gap-1.5 sm:gap-2.5 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.12] hover:border-amber-400/40 rounded-full px-2.5 sm:px-3.5 py-1.5 transition-all cursor-pointer shadow-sm active:scale-95 select-none"
        title="Clave Dinámica Nequi Style"
      >
        <div className="flex items-center gap-1.5 text-amber-400 font-extrabold text-xs">
          <KeyRound size={15} className="flex-shrink-0 animate-pulse" />
          <span className="hidden md:inline text-[11px] uppercase tracking-wider text-neutral-400 font-bold">
            Dinámica
          </span>
        </div>

        {/* Código o puntos */}
        <span className="font-mono text-xs sm:text-sm font-black text-white tracking-widest px-1">
          {claveFormateada}
        </span>

        {/* Botón Ocultar / Visualizar (El Ojito) */}
        <button
          type="button"
          onClick={handleToggleVisibilidad}
          className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition"
          title={visible ? "Ocultar clave" : "Mostrar clave"}
        >
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>

        {/* Botón Copiar */}
        <button
          type="button"
          onClick={handleCopiar}
          className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition"
          title="Copiar clave dinámica"
        >
          {copiado ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>

        {/* Temporizador circular o badge */}
        <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-400/20 px-2 py-0.5 rounded-full ml-0.5">
          <Clock size={11} className="hidden sm:inline" />
          <span>{segundos}s</span>
        </div>
      </div>

      {/* Popover flotante desplegable con detalles y acciones adicionales */}
      {abierto && (
        <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-neutral-950/95 backdrop-blur-3xl rounded-3xl border border-white/[0.15] shadow-2xl z-50 p-5 space-y-4 animate-fade-in text-left">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <KeyRound size={16} className="text-amber-400" />
              <span className="text-xs font-extrabold text-white uppercase tracking-wider">
                Clave Dinámica Nequi
              </span>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              Vence en <strong className="text-amber-400">{segundos}s</strong>
            </span>
          </div>

          <div className="text-center py-2 space-y-2">
            <p className="text-[11px] text-neutral-400">Tu código de seguridad temporal es:</p>
            <div className="p-3 bg-white/[0.05] border border-white/10 rounded-2xl flex items-center justify-center gap-2">
              <span className="font-mono text-2xl font-black text-white tracking-[0.25em]">
                {visible && claveReal ? claveReal : "••••••"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleToggleVisibilidad}
              className="apple-glass-button py-2 px-3 rounded-xl text-xs font-bold text-neutral-300 hover:text-white flex items-center justify-center gap-1.5 transition"
            >
              {visible ? <EyeOff size={14} /> : <Eye size={14} />}
              {visible ? "Ocultar" : "Revelar"}
            </button>
            <button
              onClick={handleCopiar}
              className="py-2 px-3 rounded-xl text-xs font-bold bg-white hover:bg-neutral-100 text-black flex items-center justify-center gap-1.5 transition active:scale-95 shadow"
            >
              {copiado ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              {copiado ? "¡Copiada!" : "Copiar"}
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] text-[11px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                cargarNuevaClave();
              }}
              disabled={cargando}
              className="text-neutral-400 hover:text-white flex items-center gap-1 transition"
            >
              <RefreshCw size={12} className={cargando ? "animate-spin" : ""} />
              Nueva clave
            </button>

            <Link
              href="/cliente/clave-dinamica"
              onClick={() => setAbierto(false)}
              className="text-amber-400 hover:text-amber-300 font-bold hover:underline"
            >
              Ver completa →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
