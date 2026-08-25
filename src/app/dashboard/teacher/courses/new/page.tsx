import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createCourse } from "@/app/dashboard/teacher/courses/actions";

const categories = [
  "ACADEMIC",
  "CAREER_DEVELOPMENT",
  "TECHNOLOGY",
  "AI",
  "CODING",
  "FINANCIAL_LITERACY",
  "COMMUNICATION",
  "LEADERSHIP",
  "MINDSET",
  "DISCIPLINE",
  "LIFE_SKILLS",
] as const;

export default async function NewCoursePage() {
  const classLevels = await prisma.classLevel.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    include: { curriculum: { select: { name: true } } },
  });

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <Link href="/dashboard/teacher" className="text-sm text-text-secondary hover:text-text-primary">
        ← Teacher dashboard
      </Link>
      <h1 className="mt-4 text-h2 font-semibold text-text-primary">Create a course</h1>
      <p className="mt-1 text-sm text-text-secondary">
        You can add modules, lessons, and assignments after creating it.
      </p>

      <form action={createCourse} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-text-secondary" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-sm text-text-secondary" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={3}
            className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-sm text-text-secondary" htmlFor="category">
            Category
          </label>
          <select
            id="category"
            name="category"
            required
            className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-text-secondary" htmlFor="difficulty">
              Difficulty
            </label>
            <select
              id="difficulty"
              name="difficulty"
              className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary" htmlFor="estimatedMinutes">
              Duration (minutes)
            </label>
            <input
              id="estimatedMinutes"
              name="estimatedMinutes"
              type="number"
              min={1}
              className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-text-secondary" htmlFor="classLevelId">
            Class level (optional)
          </label>
          <select
            id="classLevelId"
            name="classLevelId"
            className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
          >
            <option value="">Not tied to a class level (Skills/Career courses)</option>
            {classLevels.map((cl) => (
              <option key={cl.id} value={cl.id}>
                {cl.curriculum.name} — {cl.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-text-secondary" htmlFor="instructorName">
            Instructor name
          </label>
          <input
            id="instructorName"
            name="instructorName"
            placeholder="Defaults to your name"
            className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
          />
        </div>

        <button
          type="submit"
          className="rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
        >
          Create course
        </button>
      </form>
    </div>
  );
}
