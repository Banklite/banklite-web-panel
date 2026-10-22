'use client';

import { useEffect, useState, useRef } from "react";
import { KeyRound, Eye, EyeOff, Copy, Check, Clock, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useClaveDinamica } from "@/context/ClaveDinamicaContext";

export function ClaveDinamicaWidget({ idUsuario }: { idUsuario: string }) {
  const { clave, cargando, segundosRestantes, regenerar, setIdUsuario } = useClaveDinamica();
  const [visible, setVisible] = useState<boolean>(false);
  const [copiado, setCopiado] = useState<boolean>(false);
  const [abierto, setAbierto] = useState<boolean>(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (idUsuario) setIdUsuario(idUsuario);
  }, [idUsuario, setIdUsuario]);

  const claveReal = clave;
  const segundos = segundosRestantes;

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
    : "*** ***";

  return (
    <div className="relative" ref={widgetRef}>
      <div
        onClick={() => setAbierto((prev) => !prev)}
        className="group flex items-center gap-1.5 sm:gap-2.5 bg-white/90 hover:bg-white border border-slate-200/80 hover:border-amber-400/50 rounded-full px-2.5 sm:px-3.5 py-1.5 transition-all cursor-pointer shadow-sm active:scale-[0.97] select-none text-slate-800"
        title="Clave Dinámica"
      >
        <div className="flex items-center gap-1.5 text-amber-500 font-extrabold text-xs">
          <KeyRound size={15} className="flex-shrink-0 animate-pulse" />
          <span className="hidden md:inline text-[11px] uppercase tracking-wider text-slate-500 font-bold">
            Dinámica
          </span>
        </div>
        <span className="font-mono text-xs sm:text-sm font-black text-slate-900 tracking-widest px-1">
          {claveFormateada}
        </span>
        <button
          type="button"
          onClick={handleToggleVisibilidad}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition active:scale-[0.95]"
          title={visible ? 'Ocultar clave' : 'Mostrar clave'}
        >
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        <button
          type="button"
          onClick={handleCopiar}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition active:scale-[0.95]"
          title="Copiar clave dinámica"
        >
          {copiado ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
        </button>
        <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full ml-0.5">
          <Clock size={11} className="hidden sm:inline" />
          <span>{segundos}s</span>
        </div>
      </div>

      {abierto && (
        <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-white/95 backdrop-blur-3xl rounded-3xl border border-slate-200/90 shadow-2xl z-50 p-5 space-y-4 animate-fade-in text-left text-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <KeyRound size={16} className="text-amber-500" />
              <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Clave Dinámica
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              Vence en <strong className="text-amber-600">{segundos}s</strong>
            </span>
          </div>

          <div className="text-center py-2 space-y-2">
            <p className="text-[11px] text-slate-500">Tu código de seguridad temporal es:</p>
            <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-2xl flex items-center justify-center gap-2 shadow-inner">
              <span className="font-mono text-2xl font-black text-slate-900 tracking-[0.25em]">
                {visible && claveReal ? claveReal : '******'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleToggleVisibilidad}
              className="apple-glass-button py-2 px-3 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 flex items-center justify-center gap-1.5 transition active:scale-[0.97]"
            >
              {visible ? <EyeOff size={14} /> : <Eye size={14} />}
              {visible ? 'Ocultar' : 'Revelar'}
            </button>
            <button
              onClick={handleCopiar}
              className="py-2 px-3 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-1.5 transition active:scale-[0.97] shadow"
            >
              {copiado ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              {copiado ? '¡Copiada!' : 'Copiar'}
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                regenerar(true);
              }}
              disabled={cargando}
              className="text-slate-500 hover:text-slate-900 flex items-center gap-1 transition"
            >
              <RefreshCw size={12} className={cargando ? 'animate-spin' : ''} />
              <span>Regenerar ahora</span>
            </button>
            <Link
              href="/cliente/clave-dinamica"
              className="font-bold text-sky-600 hover:text-sky-700 transition"
            >
              Configurar 2FA
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
