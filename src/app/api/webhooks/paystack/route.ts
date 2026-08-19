import crypto from "node:crypto";
import { activateSubscriptionForReference, reversePaymentForReference } from "@/lib/paystack";

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const signature = request.headers.get("x-paystack-signature");

  if (!secret || !signature) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rawBody = await request.text();
  const expectedSignature = crypto
    .createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");

  if (expectedSignature !== signature) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "charge.success") {
    await activateSubscriptionForReference(event.data.reference);
  }

  // Refund/chargeback event names and payload shape per Paystack's webhook
  // docs — not exercised against a live Paystack event in this environment
  // (no test-mode refund was available to trigger), so the reversal logic
  // itself (reversePaymentForReference) was verified directly instead. The
  // reference lookup below tries the field paths Paystack documents for
  // each event type.
  if (event.event === "refund.processed") {
    const reference = event.data?.transaction_reference ?? event.data?.transaction?.reference;
    if (reference) await reversePaymentForReference(reference, "Refund processed");
  }
  if (event.event === "charge.dispute.create") {
    const reference = event.data?.transaction?.reference;
    if (reference) await reversePaymentForReference(reference, "Chargeback/dispute opened");
  }

  return new Response("OK", { status: 200 });
}
