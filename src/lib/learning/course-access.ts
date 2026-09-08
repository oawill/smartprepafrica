import type { SubscriptionPlan } from "@prisma/client";

/** A course that requires a subscription is enrollable only on an active
 * paying plan — FREE-plan students can browse it but not enroll. */
export function canEnrollInCourse(plan: SubscriptionPlan, requiresSubscription: boolean): boolean {
  return !requiresSubscription || plan !== "FREE";
}
