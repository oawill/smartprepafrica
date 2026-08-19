import { prisma } from "@/lib/prisma";

export type Rating = { avg: number | null; count: number };

export async function getSchoolRating(schoolId: string): Promise<Rating> {
  const result = await prisma.courseReview.aggregate({
    where: { course: { schoolId } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return { avg: result._avg.rating, count: result._count.rating };
}

export async function getTeacherRating(teacherId: string): Promise<Rating> {
  const result = await prisma.courseReview.aggregate({
    where: { course: { teacherId } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return { avg: result._avg.rating, count: result._count.rating };
}

export async function getCourseRating(courseId: string): Promise<Rating> {
  const result = await prisma.courseReview.aggregate({
    where: { courseId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return { avg: result._avg.rating, count: result._count.rating };
}

/** Never claim a rating without real reviews behind it. */
export function formatRating(rating: Rating): string {
  if (rating.count === 0 || rating.avg === null) return "No ratings yet";
  return `${rating.avg.toFixed(1)} ★ (${rating.count} review${rating.count === 1 ? "" : "s"})`;
}
