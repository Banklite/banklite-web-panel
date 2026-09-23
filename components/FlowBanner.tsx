export function FlowBanner({ steps }: { steps: string[] }) {
  return (
    <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
      <p className="text-sm font-semibold text-brand-700 mb-2">Orden sugerido en esta pantalla</p>
      <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </div>
  );
}
