export type DateRangeKey = "today" | "week" | "month" | "quarter" | "year" | "all";

export const DATE_RANGE_LABELS: Record<DateRangeKey, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  quarter: "This quarter",
  year: "This year",
  all: "All time",
};

export function parseDateRange(value: string | undefined): DateRangeKey {
  const valid: DateRangeKey[] = ["today", "week", "month", "quarter", "year", "all"];
  return valid.includes(value as DateRangeKey) ? (value as DateRangeKey) : "month";
}

/** Returns the start of the given range, or null for "all" (no lower bound). */
export function rangeSince(range: DateRangeKey): Date | null {
  const now = new Date();
  switch (range) {
    case "today": {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "week": {
      const d = new Date();
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "month": {
      const d = new Date();
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "quarter": {
      const d = new Date();
      const quarterStartMonth = Math.floor(d.getMonth() / 3) * 3;
      d.setMonth(quarterStartMonth, 1);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "year": {
      const d = new Date();
      d.setMonth(0, 1);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "all":
      return null;
    default:
      return now;
  }
}
