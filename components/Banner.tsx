"use client";

import { useEffect, useState } from "react";

/** Notificación flotante de éxito/error.
 *
 * Antes se insertaba en el flujo normal de la página (empujaba el resto del
 * contenido hacia abajo). Ahora flota en la esquina superior derecha, sin
 * afectar el layout de la página.
 *
 * Los mensajes de éxito se autoocultan solos (son informativos, no requieren
 * acción). Los de error NO se autoocultan — el usuario debe cerrarlos con la
 * ×, porque suelen indicar algo que hay que corregir (fondos insuficientes,
 * credenciales incorrectas, etc.) y es fácil perderlos si desaparecen solos.
 */
export function Banner({ kind, text }: { kind: "success" | "error"; text: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    if (kind === "error") return;
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [kind, text]);

  if (!visible) return null;

  const styles =
    kind === "success"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-red-50 text-red-700 border-red-200";

  return (
    <div
      role="status"
      className={`fixed top-5 right-5 z-[100] max-w-sm text-sm px-4 py-3 rounded-xl border shadow-xl animate-fade-in-up break-words ${styles}`}
    >
      <div className="flex items-start gap-2">
        <span className="flex-1">{text}</span>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Cerrar notificación"
          className="text-current opacity-50 hover:opacity-100 leading-none text-base"
        >
          ×
        </button>
      </div>
    </div>
  );
}
