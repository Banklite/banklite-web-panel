export function Banner({ kind, text }: { kind: "success" | "error"; text: string }) {
  const styles =
    kind === "success"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-red-50 text-red-700 border-red-200";
  return (
    <div className={`text-sm px-3 py-2 rounded-md border ${styles} mb-3 break-words`}>
      {text}
    </div>
  );
}
