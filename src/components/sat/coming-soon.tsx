export function ComingSoon({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border-strong p-6 text-center">
      <p className="text-sm font-medium text-text-primary">{label}</p>
      <p className="mt-1 text-xs text-text-muted">Coming soon in a later phase.</p>
    </div>
  );
}
