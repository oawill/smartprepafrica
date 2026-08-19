"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";
import { generateTransactionNumber } from "@/lib/admin/ids";

/** Records a refund as a new ledger row rather than mutating the original
 * charge — the historical Payment row is never edited. This is a
 * ledger-correction record for the admin's own books; it does not call out
 * to Paystack's refund API (no live refund integration exists in this
 * environment — see final report limitations). */
export async function refundPayment(formData: FormData) {
  const session = await requireActionPermission("payments.refund");
  const paymentId = formData.get("paymentId") as string;
  const reason = ((formData.get("reason") as string) || "").trim();
  if (!reason) throw new Error("A reason is required to record a refund.");

  const original = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  if (original.status !== "SUCCESS" || original.kind !== "CHARGE") {
    throw new Error("Only successful charges can be refunded.");
  }
  const alreadyRefunded = await prisma.payment.findFirst({
    where: { reversalOfId: original.id, kind: "REFUND" },
  });
  if (alreadyRefunded) throw new Error("This payment has already been refunded.");

  const transactionNumber = await generateTransactionNumber();
  const refund = await prisma.payment.create({
    data: {
      userId: original.userId,
      subscriptionId: original.subscriptionId,
      amountKobo: original.amountKobo,
      currency: original.currency,
      provider: original.provider,
      reference: `REFUND-${original.reference}`,
      status: "SUCCESS",
      kind: "REFUND",
      reversalOfId: original.id,
      transactionNumber,
    },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "PAYMENT_REFUNDED",
    resourceType: "Payment",
    resourceId: original.id,
    result: "SUCCESS",
    after: { refundId: refund.id, reason, amountKobo: original.amountKobo },
  });

  revalidatePath("/dashboard/admin/finance");
}
