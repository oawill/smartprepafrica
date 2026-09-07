import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/brand/public-header";
import { Card } from "@/components/dashboard/card";
import { ComingSoon } from "@/components/toefl/coming-soon";
import { TOEFL_SKILL_LABELS, TOEFL_SKILLS } from "@/lib/toefl/types";
import { isToeflEnabled } from "@/lib/toefl/config";
import { formatInternationalExamPrice } from "@/lib/international-exams/pricing";

export const metadata: Metadata = {
  title: "TOEFL Preparation Nigeria — TOEFL Practice & Mock Test",
  description:
    "Prepare for the TOEFL iBT with SmartPrepAfrica — Reading, Listening, Speaking, and Writing practice, full-length TOEFL mock tests, and AI-powered study support for students in Nigeria preparing to study abroad.",
};

export default function ToeflLandingPage() {
  if (!isToeflEnabled()) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />
      <div className="mx-auto w-full max-w-5xl px-6 py-12">
        <Link href="/" className="text-sm text-text-secondary hover:text-text-primary">
          ← Back home
        </Link>

        <h1 className="mt-4 text-3xl font-semibold text-text-primary">TOEFL iBT Preparation</h1>
        <p className="mt-2 max-w-2xl text-text-secondary">
          Build your TOEFL readiness across all four skills — Reading, Listening, Speaking, and Writing — with
          SmartPrepAfrica&apos;s independently created practice materials.
        </p>
        <p className="mt-4 text-xs text-text-muted">
          SmartPrepAfrica TOEFL preparation materials are independently created for educational purposes.
          SmartPrepAfrica is not affiliated with or endorsed by ETS or the TOEFL program. TOEFL is a registered
          trademark of Educational Testing Service (ETS).
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOEFL_SKILLS.map((skill) => {
            const href =
              skill === "READING"
                ? "/international-exams/toefl/reading"
                : skill === "LISTENING"
                  ? "/international-exams/toefl/listening"
                  : skill === "WRITING"
                    ? "/international-exams/toefl/writing"
                    : skill === "SPEAKING"
                      ? "/international-exams/toefl/speaking"
                      : null;
            return href ? (
              <Link key={skill} href={href}>
                <Card title={TOEFL_SKILL_LABELS[skill]} className="transition hover:border-border-strong">
                  <p className="text-sm text-brand-text">Start {TOEFL_SKILL_LABELS[skill]} practice →</p>
                </Card>
              </Link>
            ) : (
              <Card key={skill} title={TOEFL_SKILL_LABELS[skill]}>
                <p className="text-sm text-text-secondary">Practice tasks for {TOEFL_SKILL_LABELS[skill].toLowerCase()}.</p>
              </Card>
            );
          })}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card title="Diagnostic Test">
            <Link href="/international-exams/toefl/diagnostic" className="text-sm text-brand-text hover:underline">
              Estimate your starting TOEFL readiness score →
            </Link>
          </Card>
          <Card title="Practice by Skill">
            <ComingSoon label="Focused practice for each of the four skills" />
          </Card>
          <Card title="Mock Exam">
            <Link href="/international-exams/toefl/mock-exam" className="text-sm text-brand-text hover:underline">
              Take a full-length timed practice exam →
            </Link>
          </Card>
          <Card title="Progress">
            <Link href="/international-exams/toefl/dashboard" className="text-sm text-brand-text hover:underline">
              View your TOEFL dashboard →
            </Link>
          </Card>
          <Card title="Score Goal">
            <ComingSoon label="Set and track a target TOEFL score" />
          </Card>
        </div>

        <div className="mt-10 rounded-2xl border border-brand/30 bg-brand/5 p-6 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-text">TOEFL Prep</p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">{formatInternationalExamPrice("TOEFL")}</p>
          <p className="mt-1 text-sm text-text-secondary">One-time access to the full TOEFL prep product.</p>
          <Link
            href="/pricing#international-exam-prep"
            className="mt-4 inline-block rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
          >
            View Pricing
          </Link>
        </div>
      </div>
    </div>
  );
}
