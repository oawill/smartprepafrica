import { requireAdminPagePermission } from "@/lib/admin/authz";
import { createProgramme } from "@/app/dashboard/admin/programmes/actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand";
const labelClass = "block text-xs text-text-secondary";

export default async function NewProgrammePage() {
  await requireAdminPagePermission("programmes.manage");

  return (
    <div>
      <h1 className="text-h2 font-semibold text-text-primary">New programme</h1>
      <p className="mt-1 text-sm text-text-secondary">
        You&apos;ll add member courses on the next page.
      </p>
      <div className="mt-6 max-w-xl">
        <form action={createProgramme} className="space-y-5">
          <div>
            <label className={labelClass}>Title</label>
            <input name="title" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Description (optional)</label>
            <textarea name="description" rows={3} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Cover image URL (optional)</label>
            <input name="coverImageUrl" placeholder="https://…" className={inputClass} />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
          >
            Create programme
          </button>
        </form>
      </div>
    </div>
  );
}
