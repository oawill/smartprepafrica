import type { SubscriptionPlan } from "@prisma/client";

/** A course that requires a subscription is enrollable only on an active
 * paying plan — FREE-plan students can browse it but not enroll. */
export function canEnrollInCourse(plan: SubscriptionPlan, requiresSubscription: boolean): boolean {
  return !requiresSubscription || plan !== "FREE";
}

/** An archived (Skills-vertical-removal) course 404s for anyone not
 * already enrolled — an enrolled learner's URL and progress are
 * completely unaffected. */
export function shouldHideArchivedCourse(archived: boolean, isEnrolled: boolean): boolean {
  return archived && !isEnrolled;
}
