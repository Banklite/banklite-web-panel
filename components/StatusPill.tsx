import { STATUS_STYLES } from "@/lib/format";

export function StatusPill({ value }: { value: string }) {
  const cls = STATUS_STYLES[value] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cls}`}>
      {value}
    </span>
  );
}
