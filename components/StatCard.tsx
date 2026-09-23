export function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="relative group p-0.5 bg-gradient-to-br from-corporate-glow via-transparent to-corporate-glow rounded-xl overflow-hidden animate-fade-in-up">
      <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 p-5 transition-transform duration-300 group-hover:scale-105">
        <p className="text-sm text-slate-400 uppercase tracking-wider">{label}</p>
        <p className={`text-3xl font-bold mt-2 ${accent}`}>{value}</p>
      </div>
    </div>
  );
}
