import { requireAdminPagePermission } from "@/lib/admin/authz";
import { createCurriculum } from "@/app/dashboard/admin/learning/curriculum/actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500";
const labelClass = "block text-xs text-slate-400";

export default async function NewCurriculumPage() {
  await requireAdminPagePermission("curriculum.manage");

  return (
    <div>
      <h1 className="text-2xl font-semibold">New curriculum</h1>
      <p className="mt-1 text-sm text-slate-400">
        e.g. &ldquo;Nigerian Secondary School (WAEC/NECO/UTME)&rdquo; — you&apos;ll add class levels (SS1, SS2, ...) on
        the next page.
      </p>
      <div className="mt-6 max-w-xl">
        <form action={createCurriculum} className="space-y-5">
          <div>
            <label className={labelClass}>Name</label>
            <input name="name" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Code (short, unique)</label>
            <input name="code" required placeholder="NG-SEC" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Country</label>
            <input name="country" defaultValue="Nigeria" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Description (optional)</label>
            <textarea name="description" rows={3} className={inputClass} />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
          >
            Create curriculum
          </button>
        </form>
      </div>
    </div>
  );
}
