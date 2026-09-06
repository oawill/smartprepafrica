import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isToeflEnabled } from "@/lib/toefl/config";
import { ListeningSessionRunner } from "@/components/toefl/listening-session-runner";

export default async function ToeflListeningSessionPage({ params }: { params: Promise<{ attemptId: string }> }) {
  if (!isToeflEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");
  const { attemptId } = await params;

  const attempt = await prisma.toeflAttempt.findUnique({
    where: { id: attemptId },
    include: {
      items: {
        orderBy: { order: "asc" },
        include: {
          // Deliberately not selecting `transcript` — this data must never
          // reach the client during active practice, only on the results
          // page's review.
          content: { select: { audioUrl: true, prompt: true, options: true } },
        },
      },
    },
  });
  if (!attempt || attempt.userId !== session.user.id) notFound();
  if (attempt.submittedAt) redirect(`/international-exams/toefl/listening/results/${attemptId}`);

  const items = attempt.items.map((item) => ({
    itemId: item.id,
    audioUrl: item.content.audioUrl ?? "",
    prompt: item.content.prompt,
    options: item.content.options,
    selectedOption: item.selectedOption,
  }));

  return <ListeningSessionRunner attemptId={attempt.id} items={items} />;
}
