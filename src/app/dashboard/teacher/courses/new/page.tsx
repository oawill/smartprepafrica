import Link from "next/link";
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

export default function NewCoursePage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <Link href="/dashboard/teacher" className="text-sm text-slate-400 hover:text-white">
        ← Teacher dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Create a course</h1>
      <p className="mt-1 text-sm text-slate-400">
        You can add modules, lessons, and assignments after creating it.
      </p>

      <form action={createCourse} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-slate-300" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300" htmlFor="category">
            Category
          </label>
          <select
            id="category"
            name="category"
            required
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
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
            <label className="block text-sm text-slate-300" htmlFor="difficulty">
              Difficulty
            </label>
            <select
              id="difficulty"
              name="difficulty"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300" htmlFor="estimatedMinutes">
              Duration (minutes)
            </label>
            <input
              id="estimatedMinutes"
              name="estimatedMinutes"
              type="number"
              min={1}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-slate-300" htmlFor="instructorName">
            Instructor name
          </label>
          <input
            id="instructorName"
            name="instructorName"
            placeholder="Defaults to your name"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
          />
        </div>

        <button
          type="submit"
          className="rounded-full bg-orange-500 px-6 py-2.5 text-sm font-medium text-slate-950 hover:bg-orange-400"
        >
          Create course
        </button>
      </form>
    </div>
  );
}
