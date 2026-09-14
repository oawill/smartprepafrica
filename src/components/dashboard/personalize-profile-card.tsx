import Link from "next/link";
import { Card } from "@/components/dashboard/card";

// Non-blocking — shown to existing students who haven't been through
// /onboarding (StudentProfile.onboardingCompleted is false), never gating
// the rest of the dashboard underneath it.
export function PersonalizeProfileCard({
  title,
  body,
  buttonLabel,
}: {
  title: string;
  body: string;
  buttonLabel: string;
}) {
  return (
    <div className="mt-6">
      <Card title={title}>
        <p className="text-sm text-text-secondary">{body}</p>
        <Link
          href="/onboarding"
          className="mt-3 inline-block rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
        >
          {buttonLabel}
        </Link>
      </Card>
    </div>
  );
}
