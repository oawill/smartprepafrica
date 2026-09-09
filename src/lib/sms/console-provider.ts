import type { SmsProvider } from "@/lib/sms/provider";

// No real SMS/WhatsApp provider chosen yet (see docs/migration-plan.md
// Door 1). Logs the code server-side so it's visible in server logs
// during development/QA instead of sending anything. Swap
// getSmsProvider() in src/lib/sms/index.ts for a real implementation
// (Termii/Twilio/Africa's Talking) once one is chosen — nothing else
// in this file or its callers needs to change.
export class ConsoleSmsProvider implements SmsProvider {
  async sendOtp(phone: string, code: string): Promise<{ ok: boolean }> {
    console.log(`[SMS OTP] ${phone}: ${code}`);
    return { ok: true };
  }
}
