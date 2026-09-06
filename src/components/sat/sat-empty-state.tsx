export function SatEmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border-strong p-6 text-center text-sm text-text-secondary">
      {message}
    </p>
  );
}
