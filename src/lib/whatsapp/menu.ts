export const MAIN_MENU_TEXT = `🎓 SmartPrepAfrica Learning
What would you like to do?

1️⃣ Exam Prep
2️⃣ Daily Practice
3️⃣ My Progress
4️⃣ Help & Support

Reply with a number, or MENU anytime to come back here.`;

export type MainMenuChoice = "EXAM_PREP" | "DAILY_PRACTICE" | "PROGRESS" | "HELP" | null;

/** Accepts both a numbered reply ("1") and free text ("exam prep") —
 * per the brief's "allow both number and text responses." */
export function parseMainMenuChoice(body: string): MainMenuChoice {
  const normalized = body.trim().toLowerCase();
  if (["1", "exam prep", "examprep"].includes(normalized)) return "EXAM_PREP";
  if (["2", "daily practice", "practice"].includes(normalized)) return "DAILY_PRACTICE";
  if (["3", "my progress", "progress"].includes(normalized)) return "PROGRESS";
  if (["4", "help", "help & support", "support"].includes(normalized)) return "HELP";
  return null;
}

export type GlobalCommand = "MENU" | "HELP" | "STOP" | "START" | null;

/** These four commands work from anywhere, regardless of the
 * conversation's current state — matching the brief's "Also support:
 * MENU / HELP / STOP / START" requirement. */
export function parseGlobalCommand(body: string): GlobalCommand {
  const normalized = body.trim().toLowerCase();
  if (["menu", "hi", "hello", "start over", "home"].includes(normalized)) return "MENU";
  if (normalized === "help") return "HELP";
  if (normalized === "stop" || normalized === "unsubscribe") return "STOP";
  if (normalized === "start") return "START";
  return null;
}

export const HELP_TEXT = `🆘 Help & Support

Commands you can use anytime:
MENU — return to the main menu
HELP — show this message
STOP — opt out of WhatsApp messages
START — opt back in

Need more help? Visit smartprepafrica.com/contact`;

export const UNSUBSCRIBED_TEXT = `You've been unsubscribed from SmartPrepAfrica WhatsApp messages. Reply START to resume.`;

export const OPTED_OUT_CONFIRMATION_TEXT = `You're now unsubscribed from SmartPrepAfrica WhatsApp messages. Reply START anytime to resume.`;

export const OPTED_IN_CONFIRMATION_TEXT = `Welcome back! You're resubscribed.\n\n${MAIN_MENU_TEXT}`;
