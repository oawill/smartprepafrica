import { Resend } from "resend";

/** Every SmartPrepAfrica transactional email (password reset today, other
 * auth emails later) goes through this one function — server-only, never
 * imported into a client component. The Resend SDK returns {data, error}
 * rather than throwing, so callers must check `error` explicitly. */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.RESEND_EMAIL_DOMAIN;
}

let client: Resend | null = null;
function getClient(): Resend {
  if (!client) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("Email is not configured. Set RESEND_API_KEY in .env.");
    }
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

/** Default "from" address, built from the verified sending domain. A
 * distinct RESEND_FROM_EMAIL override is supported for local testing
 * against Resend's onboarding@resend.dev sandbox sender, which requires
 * no domain verification — production always uses the real domain. */
function defaultFromAddress(): string {
  if (process.env.RESEND_FROM_EMAIL) return process.env.RESEND_FROM_EMAIL;
  const domain = process.env.RESEND_EMAIL_DOMAIN;
  return `SmartPrepAfrica <noreply@${domain}>`;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  /** For Resend's retry-safe idempotency — format "<event-type>/<entity-id>". */
  idempotencyKey?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const resend = getClient();

  const { error } = await resend.emails.send(
    {
      from: defaultFromAddress(),
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    },
    opts.idempotencyKey ? { idempotencyKey: opts.idempotencyKey } : undefined
  );

  if (error) {
    // Never log email content/recipients' full context beyond what's
    // needed to diagnose delivery failures — and never log credentials.
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
