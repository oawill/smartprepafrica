import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/brand/public-header";
import { Card } from "@/components/dashboard/card";
import { isSatEnabled } from "@/lib/sat/config";
import { formatInternationalExamPrice } from "@/lib/international-exams/pricing";

export const metadata: Metadata = {
  title: "Digital SAT Preparation Nigeria — SAT Practice & Mock Test",
  description:
    "Prepare for the Digital SAT with SmartPrepAfrica — Reading and Writing, and Math practice, full-length SAT mock exams with adaptive modules, and AI-powered study support for students in Nigeria preparing to study abroad.",
};

export default function SatLandingPage() {
  if (!isSatEnabled()) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />
      <div className="mx-auto w-full max-w-5xl px-6 py-12">
        <Link href="/international-exams" className="text-sm text-text-secondary hover:text-text-primary">
          ← Back to International Exams
        </Link>

        <h1 className="mt-4 text-3xl font-semibold text-text-primary">Digital SAT Preparation</h1>
        <p className="mt-2 max-w-2xl text-text-secondary">
          Build your Digital SAT readiness across Reading and Writing, and Math, with SmartPrepAfrica&apos;s
          independently created practice materials.
        </p>
        <p className="mt-4 text-xs text-text-muted">
          SAT is a registered trademark of the College Board, which is not affiliated with, and does not endorse,
          this site. SmartPrepAfrica&apos;s practice materials and mock exams are an independent educational
          simulation, not an official College Board product.
        </p>

        <h2 className="mt-10 text-lg font-semibold text-text-primary">Drills</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Link href="/international-exams/sat/drill">
            <Card title="Start a Drill" className="border-brand/40 bg-brand/5 transition hover:border-brand">
              <p className="text-sm text-brand-text">
                Short, focused question sets (5–20 questions) — build mastery without a full practice session →
              </p>
            </Card>
          </Link>
          <Link href="/international-exams/sat/drill/history">
            <Card title="Drill History" className="transition hover:border-border-strong">
              <p className="text-sm text-brand-text">Review your past drills →</p>
            </Card>
          </Link>
        </div>

        <h2 className="mt-10 text-lg font-semibold text-text-primary">Practice</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Link href="/international-exams/sat/reading-writing">
            <Card title="Reading and Writing" className="transition hover:border-border-strong">
              <p className="text-sm text-brand-text">Start Reading and Writing practice →</p>
            </Card>
          </Link>
          <Link href="/international-exams/sat/math">
            <Card title="Math" className="transition hover:border-border-strong">
              <p className="text-sm text-brand-text">Start Math practice →</p>
            </Card>
          </Link>
        </div>

        <h2 className="mt-10 text-lg font-semibold text-text-primary">Mock Exams</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Link href="/international-exams/sat/diagnostic">
            <Card title="Diagnostic Test" className="transition hover:border-border-strong">
              <p className="text-sm text-brand-text">Estimate your starting SAT readiness →</p>
            </Card>
          </Link>
          <Link href="/international-exams/sat/mock-exam">
            <Card title="Full-Length Mock Exams" className="transition hover:border-border-strong">
              <p className="text-sm text-brand-text">Start a timed, module-based mock exam →</p>
            </Card>
          </Link>
        </div>

        <h2 className="mt-10 text-lg font-semibold text-text-primary">Performance / Progress</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card title="Progress">
            <Link href="/international-exams/sat/dashboard" className="text-sm text-brand-text hover:underline">
              View your SAT dashboard →
            </Link>
          </Card>
          <Link href="/international-exams/sat/score-goal">
            <Card title="Score Goal" className="transition hover:border-border-strong">
              <p className="text-sm text-brand-text">Set and track a target SAT score →</p>
            </Card>
          </Link>
          <Link href="/international-exams/sat/study-plan">
            <Card title="Study Plan" className="transition hover:border-border-strong">
              <p className="text-sm text-brand-text">Get a personalized study plan →</p>
            </Card>
          </Link>
          <Link href="/international-exams/sat/review">
            <Card title="Review" className="transition hover:border-border-strong">
              <p className="text-sm text-brand-text">Review past questions by outcome →</p>
            </Card>
          </Link>
        </div>
        <p className="mt-4 text-xs text-text-muted">
          Ask SmartPrep AI is available directly on any question you get wrong in your results and review pages.
        </p>

        <div className="mt-10 rounded-2xl border border-brand/30 bg-brand/5 p-6 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-text">SAT Prep</p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">{formatInternationalExamPrice("SAT")}</p>
          <p className="mt-1 text-sm text-text-secondary">One-time access to the full Digital SAT prep product.</p>
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
