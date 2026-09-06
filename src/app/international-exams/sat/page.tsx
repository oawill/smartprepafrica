import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/brand/public-header";
import { Card } from "@/components/dashboard/card";
import { ComingSoon } from "@/components/sat/coming-soon";
import { isSatEnabled } from "@/lib/sat/config";

export const metadata: Metadata = {
  title: "Digital SAT Preparation",
  description: "Prepare for the Digital SAT with SmartPrepAfrica — Reading and Writing, and Math practice.",
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

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <Link href="/international-exams/sat/diagnostic">
            <Card title="Diagnostic Test" className="transition hover:border-border-strong">
              <p className="text-sm text-brand-text">Estimate your starting SAT readiness →</p>
            </Card>
          </Link>
          <Card title="Full-Length Mock Exams">
            <ComingSoon label="Timed, module-based full-length practice exams" />
          </Card>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          <Card title="Study Plan">
            <ComingSoon label="A personalized study plan based on your performance" />
          </Card>
          <Card title="AI Tutor">
            <ComingSoon label="Ask SmartPrep AI about any question" />
          </Card>
        </div>
      </div>
    </div>
  );
}
