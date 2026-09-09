import { getPaymentProvider } from "@/lib/payments";
import { activateSubscriptionForReference, reversePaymentForReference } from "@/lib/subscriptions/checkout";
import { activateInternationalExamPurchaseForReference } from "@/lib/international-exams/checkout-service";
import { activateSchoolLicensePurchaseForReference } from "@/lib/schools/license-checkout";

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!getPaymentProvider("paystack").verifyWebhookSignature(rawBody, request.headers)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "charge.success") {
    // The webhook URL is one fixed account-wide setting in Paystack, so
    // every one-time/subscription purchase flow lands here. Each
    // activation function is a safe no-op when the reference doesn't
    // belong to its own table (Payment vs. InternationalExamPurchase vs.
    // SchoolLicensePurchase), so calling all of them unconditionally is
    // safe and needs no branching — the existing subscription activation
    // call is untouched.
    await activateSubscriptionForReference(event.data.reference);
    await activateInternationalExamPurchaseForReference(event.data.reference);
    await activateSchoolLicensePurchaseForReference(event.data.reference);
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
