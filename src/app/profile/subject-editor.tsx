"use client";

import { useMemo, useState } from "react";
import type { AcademicTrack } from "@prisma/client";
import { updateSubjects } from "@/app/profile/actions";

type Subject = { id: string; name: string; academicTracks: AcademicTrack[] };

function SubjectGroup({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: Subject[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3 first:mt-0">
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">{title}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((subject) => (
          <label
            key={subject.id}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-border-strong bg-surface-raised px-3 py-2.5 text-sm text-text-primary transition hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand/10"
          >
            <input
              type="checkbox"
              name="subjectIds"
              value={subject.id}
              checked={selected.has(subject.id)}
              onChange={() => onToggle(subject.id)}
              className="h-4 w-4 accent-brand"
            />
            {subject.name}
          </label>
        ))}
      </div>
    </div>
  );
}

/** Client component so the search box can filter in-memory without a
 * round trip — the actual submit is still a plain Server Action POST
 * (Next.js supports passing a Server Action as a prop into a Client
 * Component), so no new API route or client-side mutation logic exists. */
export function SubjectEditor({
  subjects,
  currentSubjectIds,
  academicTrack,
}: {
  subjects: Subject[];
  currentSubjectIds: string[];
  academicTrack: AcademicTrack | null;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(currentSubjectIds));

  const filtered = useMemo(
    () => subjects.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase())),
    [subjects, query]
  );

  const recommended = filtered.filter(
    (s) => academicTrack && academicTrack !== "UNDECIDED" && s.academicTracks.includes(academicTrack)
  );
  const general = filtered.filter((s) => s.academicTracks.length === 0);
  const byTrack = (track: AcademicTrack) =>
    filtered.filter((s) => s.academicTracks.includes(track) && !recommended.includes(s));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form action={updateSubjects}>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search subjects…"
        className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
      />

      <div className="mt-3 max-h-[50vh] overflow-y-auto pr-1">
        <SubjectGroup title="Recommended for you" items={recommended} selected={selected} onToggle={toggle} />
        <SubjectGroup title="Science" items={byTrack("SCIENCE")} selected={selected} onToggle={toggle} />
        <SubjectGroup title="Arts" items={byTrack("ARTS")} selected={selected} onToggle={toggle} />
        <SubjectGroup title="Commercial" items={byTrack("COMMERCIAL")} selected={selected} onToggle={toggle} />
        <SubjectGroup title="General" items={general} selected={selected} onToggle={toggle} />
        {filtered.length === 0 && <p className="text-sm text-text-muted">No subjects match your search.</p>}
      </div>

      <p className="mt-3 text-xs text-text-muted">{selected.size} selected</p>
      <button
        type="submit"
        className="mt-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
      >
        Save Changes
      </button>
    </form>
  );
}
