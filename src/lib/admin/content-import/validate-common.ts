export type RowStatus = "VALID" | "WARNING" | "ERROR";

export type RowValidationResult = {
  status: RowStatus;
  messages: string[];
};

/** Same fail/warn accumulation shape as validateRow() in question-csv.ts —
 * an ERROR always wins over a WARNING for the row's final status. */
export function createValidator() {
  const messages: string[] = [];
  let status: RowStatus = "VALID";
  return {
    fail(msg: string) {
      messages.push(msg);
      status = "ERROR";
    },
    warn(msg: string) {
      messages.push(msg);
      if (status === "VALID") status = "WARNING";
    },
    result(): RowValidationResult {
      if (messages.length === 0) messages.push("Looks good.");
      return { status, messages };
    },
  };
}

export const VALID_DIFFICULTIES = new Set(["EASY", "MEDIUM", "HARD"]);
export const VALID_STATUSES = new Set(["DRAFT", "NEEDS_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"]);

export function isValidUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}
