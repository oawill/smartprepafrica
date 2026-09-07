"use client";

import { useState } from "react";
import type { SatSection } from "@prisma/client";

export type DrillDomainOption = { domain: string; skills: string[] };

const SECTION_LABEL: Record<SatSection, string> = {
  READING_WRITING: "Reading & Writing",
  MATH: "Math",
};

const SIZE_DESCRIPTIONS: { key: string; size: number; label: string; description: string }[] = [
  { key: "QUICK", size: 5, label: "Quick Drill", description: "~5–8 minutes" },
  { key: "FOCUS", size: 10, label: "Focus Drill", description: "Focused practice on one skill" },
  { key: "PRACTICE_SET", size: 15, label: "Practice Set", description: "More substantial practice" },
  { key: "CHALLENGE", size: 20, label: "Challenge Drill", description: "A longer mixed session" },
];

/** Section → domain → skill cascading picker, sourced entirely from real
 * distinct SatContent values passed in as props (never a hardcoded
 * taxonomy) — plus drill size (question count always shown before
 * starting) and the timer on/off toggle. A small client component only
 * because the domain/skill cascade needs local state; submission itself
 * goes straight through the server action passed as the form's action. */
export function SatDrillPicker({
  domainsBySection,
  action,
}: {
  domainsBySection: Record<SatSection, DrillDomainOption[]>;
  action: (formData: FormData) => void;
}) {
  const [section, setSection] = useState<SatSection>("READING_WRITING");
  const [domain, setDomain] = useState<string>("");
  const [skill, setSkill] = useState<string>("");
  const [size, setSize] = useState<number>(10);
  const [timerOn, setTimerOn] = useState(false);

  const domainOptions = domainsBySection[section] ?? [];
  const skillOptions = domainOptions.find((d) => d.domain === domain)?.skills ?? [];

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="section" value={section} />
      <input type="hidden" name="domain" value={domain} />
      <input type="hidden" name="skill" value={skill} />
      <input type="hidden" name="size" value={size} />
      <input type="hidden" name="timer" value={timerOn ? "on" : "off"} />

      <div>
        <label className="block text-sm text-text-secondary">Section</label>
        <div className="mt-2 flex gap-2">
          {(Object.keys(SECTION_LABEL) as SatSection[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSection(s);
                setDomain("");
                setSkill("");
              }}
              className={`rounded-full px-4 py-1.5 text-sm ${
                section === s ? "bg-brand text-brand-foreground" : "border border-border-strong text-text-secondary"
              }`}
            >
              {SECTION_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-text-secondary">Domain (optional — mixed if none selected)</label>
        <select
          value={domain}
          onChange={(e) => {
            setDomain(e.target.value);
            setSkill("");
          }}
          className="mt-2 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand sm:w-auto"
        >
          <option value="">Mixed {SECTION_LABEL[section]}</option>
          {domainOptions.map((d) => (
            <option key={d.domain} value={d.domain}>
              {d.domain}
            </option>
          ))}
        </select>
      </div>

      {domain && skillOptions.length > 0 && (
        <div>
          <label className="block text-sm text-text-secondary">Skill (optional)</label>
          <select
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand sm:w-auto"
          >
            <option value="">All skills in {domain}</option>
            {skillOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm text-text-secondary">Drill size</label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {SIZE_DESCRIPTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSize(s.size)}
              className={`rounded-lg border px-4 py-3 text-left text-sm ${
                size === s.size ? "border-brand bg-brand/5" : "border-border-strong hover:border-text-muted"
              }`}
            >
              <span className="font-medium text-text-primary">
                {s.label} — {s.size} questions
              </span>
              <span className="mt-0.5 block text-xs text-text-muted">{s.description}</span>
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-text-secondary">
        <input type="checkbox" checked={timerOn} onChange={(e) => setTimerOn(e.target.checked)} />
        Use a timer during this drill
      </label>

      <button
        type="submit"
        className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
      >
        Start Drill — {size} questions
      </button>
    </form>
  );
}
