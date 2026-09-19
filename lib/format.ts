/** Helpers de formato compartidos entre las páginas del panel. */

export function short(id: string) {
  return id.slice(0, 8) + "…";
}

export const STATUS_STYLES: Record<string, string> = {
  verificado: "bg-emerald-100 text-emerald-700",
  activa: "bg-emerald-100 text-emerald-700",
  completada: "bg-emerald-100 text-emerald-700",
  pendiente_verificacion: "bg-amber-100 text-amber-700",
  pendiente: "bg-amber-100 text-amber-700",
  rechazado: "bg-red-100 text-red-700",
  rechazada: "bg-red-100 text-red-700",
  suspendida: "bg-amber-100 text-amber-700",
  cerrada: "bg-slate-200 text-slate-600",
};
