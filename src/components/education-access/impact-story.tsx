// Reusable presentational component for future approved impact stories
// (Student / Teacher / School / Sponsor). Not wired into any page yet —
// no real, approved stories exist. Never fabricate one: if there's nothing
// real to show, don't render this component rather than filling it with
// placeholder content that looks like a real testimonial.
export type ImpactStoryType = "STUDENT" | "TEACHER" | "SCHOOL" | "SPONSOR";

export function ImpactStory({
  type,
  quote,
  attribution,
  imageUrl,
}: {
  type: ImpactStoryType;
  quote: string;
  attribution: string;
  imageUrl?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-6">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- small, admin-supplied avatar; not worth next/image config for a component with no current callers
        <img src={imageUrl} alt="" className="mb-4 h-12 w-12 rounded-full object-cover" />
      )}
      <p className="text-sm uppercase tracking-wide text-text-muted">{type.charAt(0) + type.slice(1).toLowerCase()} Story</p>
      <p className="mt-2 text-text-secondary">&ldquo;{quote}&rdquo;</p>
      <p className="mt-3 text-sm font-medium text-text-primary">{attribution}</p>
    </div>
  );
}
