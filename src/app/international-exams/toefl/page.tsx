import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/brand/public-header";
import { Card } from "@/components/dashboard/card";
import { ComingSoon } from "@/components/toefl/coming-soon";
import { TOEFL_SKILL_LABELS, TOEFL_SKILLS } from "@/lib/toefl/types";
import { isToeflEnabled } from "@/lib/toefl/config";

export const metadata: Metadata = {
  title: "TOEFL Preparation",
  description: "Prepare for the TOEFL iBT with SmartPrepAfrica — Reading, Listening, Speaking, and Writing practice.",
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
            <ComingSoon label="Estimate your starting TOEFL readiness score" />
          </Card>
          <Card title="Practice by Skill">
            <ComingSoon label="Focused practice for each of the four skills" />
          </Card>
          <Card title="Mock Exam">
            <ComingSoon label="A full-length timed practice exam" />
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
      </div>
    </div>
  );
}
