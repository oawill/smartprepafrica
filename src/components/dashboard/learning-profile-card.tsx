import Link from "next/link";
import type { AcademicTrack } from "@prisma/client";
import { Card } from "@/components/dashboard/card";
import { examLabels } from "@/lib/exam-slugs";

type Props = {
  academicTrack: AcademicTrack | null;
  targetExams: ("WAEC" | "NECO" | "UTME" | "POST_UTME")[];
  subjectCount: number;
};

const TRACK_LABELS: Record<AcademicTrack, string> = {
  SCIENCE: "Science",
  ARTS: "Arts",
  COMMERCIAL: "Commercial",
  UNDECIDED: "Not sure yet",
};

export function LearningProfileCard({ academicTrack, targetExams, subjectCount }: Props) {
  return (
    <div className="mt-6">
      <Card title="Your Learning Profile">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
          <span>{academicTrack ? TRACK_LABELS[academicTrack] : "Track not set"}</span>
          {targetExams.length > 0 && <span>{targetExams.map((e) => examLabels[e]).join(" + ")}</span>}
          <span>{subjectCount} subject{subjectCount === 1 ? "" : "s"}</span>
        </div>
        <Link
          href="/profile"
          className="mt-3 inline-block rounded-full border border-border-strong px-4 py-1.5 text-xs font-medium text-text-secondary hover:border-brand hover:text-brand-text"
        >
          Edit Profile
        </Link>
      </Card>
    </div>
  );
}
