type Props = {
  label: string;
  value: string;
  hint?: string;
};

export default function StatCard({ label, value, hint }: Props) {
  return (
    <div className="rounded-lg border border-hairline bg-surface px-4 py-3.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1.5 font-mono text-xl font-medium text-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
