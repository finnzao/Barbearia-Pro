export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
        {label}
      </p>
      <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-stone-900 tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
}
