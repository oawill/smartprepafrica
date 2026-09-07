import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/brand/public-header";
import { Card } from "@/components/dashboard/card";
import { isToeflEnabled } from "@/lib/toefl/config";
import { isSatEnabled } from "@/lib/sat/config";
import { formatInternationalExamPrice } from "@/lib/international-exams/pricing";

export const metadata: Metadata = {
  title: "International Exam Preparation Nigeria — TOEFL & SAT",
  description:
    "Prepare for TOEFL and Digital SAT with SmartPrepAfrica — structured practice, realistic mock tests, AI-powered support, and detailed performance insights for international exam preparation in Nigeria.",
};

export default function InternationalExamsPage() {
  const tracks = [
    isToeflEnabled() && {
      key: "toefl",
      href: "/international-exams/toefl",
      title: "TOEFL iBT",
      description: "Reading, Listening, Speaking, and Writing practice for the TOEFL iBT.",
      price: formatInternationalExamPrice("TOEFL"),
    },
    isSatEnabled() && {
      key: "sat",
      href: "/international-exams/sat",
      title: "Digital SAT",
      description: "Reading and Writing, and Math practice for the Digital SAT.",
      price: formatInternationalExamPrice("SAT"),
    },
  ].filter(Boolean) as { key: string; href: string; title: string; description: string; price: string }[];

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />
      <div className="mx-auto w-full max-w-5xl px-6 py-12">
        <Link href="/" className="text-sm text-text-secondary hover:text-text-primary">
          ← Back home
        </Link>
        <h1 className="mt-4 text-3xl font-semibold text-text-primary">Your Global Education Journey Starts Here</h1>
        <p className="mt-2 max-w-2xl text-text-secondary">
          Prepare for internationally recognized exams with structured practice, realistic mock tests,
          AI-powered support, and detailed performance insights.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {tracks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border-strong p-6 text-center text-sm text-text-secondary">
              No international exam tracks are available yet.
            </p>
          ) : (
            tracks.map((track) => (
              <Link key={track.key} href={track.href}>
                <Card title={track.title} className="transition hover:border-border-strong">
                  <p className="text-sm text-text-secondary">{track.description}</p>
                  <p className="mt-2 text-sm font-semibold text-brand-text">{track.price}</p>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
