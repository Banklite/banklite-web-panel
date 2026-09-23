/** Helpers de formato compartidos entre las p?ginas del panel. */

export function short(id: string) {
  if (!id) return "";
  return id.slice(0, 8) + "?";
}

export const STATUS_STYLES: Record<string, string> = {
  verificado: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  activa: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  aprobada: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  completada: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  resuelta: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  pendiente_verificacion: "bg-amber-100 text-amber-700 border border-amber-200",
  pendiente: "bg-amber-100 text-amber-700 border border-amber-200",
  revision_manual: "bg-amber-100 text-amber-700 border border-amber-200",
  media: "bg-amber-100 text-amber-700 border border-amber-200",
  rechazado: "bg-red-100 text-red-700 border border-red-200",
  rechazada: "bg-red-100 text-red-700 border border-red-200",
  bloqueada: "bg-red-100 text-red-700 border border-red-200",
  sospechosa: "bg-rose-100 text-rose-700 font-semibold border border-rose-300 animate-pulse",
  alta: "bg-rose-100 text-rose-700 font-semibold border border-rose-300",
  abierta: "bg-red-100 text-red-700 border border-red-200",
  baja: "bg-blue-100 text-blue-700 border border-blue-200",
  suspendida: "bg-amber-100 text-amber-700 border border-amber-200",
  vencida: "bg-slate-200 text-slate-600 border border-slate-300",
  cerrada: "bg-slate-200 text-slate-600 border border-slate-300",
};
