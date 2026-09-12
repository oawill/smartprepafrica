import { createHmac } from "node:crypto";
import type { WhatsAppProvider, SendWhatsAppMessageResult } from "@/lib/whatsapp/provider";

function requireCredentials(): { accountSid: string; authToken: string; from: string } {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!accountSid || !authToken || !from) {
    throw new Error(
      "WhatsApp is not configured yet. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM in .env to enable this provider."
    );
  }
  return { accountSid, authToken, from };
}

/** Structurally-complete but unconfigured — no Twilio WhatsApp sender
 * exists yet, so sendMessage throws via requireCredentials() until the
 * env vars are set. verifyWebhookSignature only needs TWILIO_AUTH_TOKEN
 * and is exercised in QA with a locally-set placeholder value. */
export class TwilioProvider implements WhatsAppProvider {
  readonly name = "twilio";

  async sendMessage(opts: { to: string; body: string }): Promise<SendWhatsAppMessageResult> {
    const { accountSid, authToken, from } = requireCredentials();

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: `whatsapp:${from}`,
          To: `whatsapp:${opts.to}`,
          Body: opts.body,
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      return { id: "", ok: false };
    }
    return { id: data.sid as string, ok: true };
  }

  /** Twilio's scheme: HMAC-SHA1 over the full request URL with every
   * POST param (sorted by key, concatenated key+value with no
   * delimiter) appended, base64-encoded, compared to the
   * X-Twilio-Signature header. https://www.twilio.com/docs/usage/webhooks/webhooks-security */
  verifyWebhookSignature(rawBody: string, headers: Headers, url: string): boolean {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const signature = headers.get("x-twilio-signature");
    if (!authToken || !signature) return false;

    const params = new URLSearchParams(rawBody);
    const sortedKeys = [...params.keys()].sort();
    let data = url;
    for (const key of sortedKeys) {
      data += key + params.get(key);
    }

    const expected = createHmac("sha1", authToken).update(data, "utf8").digest("base64");
    return expected === signature;
  }
}
