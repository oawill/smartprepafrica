import type { BadgeTone } from "@/components/ui/badge";
import type { ReadinessStatus, TopicStatus } from "@/lib/practice/readiness-service";
import { READINESS_STATUS_META, TOPIC_STATUS_LABEL } from "@/lib/practice/readiness-service";

/** Maps readiness/topic status onto the existing Badge component's tones —
 * reuses the app's established status-color system instead of inventing a
 * new one, and Badge already pairs every non-neutral tone with a default
 * icon, so status is never communicated by color alone. */
export const READINESS_STATUS_TONE: Record<ReadinessStatus, BadgeTone> = {
  STRONG: "success",
  NEEDS_IMPROVEMENT: "warning",
  PRIORITY_REVIEW: "danger",
  NOT_ENOUGH_DATA: "neutral",
};

export const TOPIC_STATUS_TONE: Record<TopicStatus, BadgeTone> = {
  STRONG: "success",
  IMPROVING: "info",
  REVIEW: "warning",
  WEAK: "danger",
  NOT_ENOUGH_DATA: "neutral",
};

export { READINESS_STATUS_META, TOPIC_STATUS_LABEL };
