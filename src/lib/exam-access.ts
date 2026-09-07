import { redirect } from "next/navigation";
import type { InternationalExamProduct } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Session-or-redirect for any protected exam-prep page/action. Sets
 * `callbackUrl` (mirroring src/proxy.ts's own redirect logic) so /login
 * can return the user to exactly the page/action they requested instead
 * of always landing on /dashboard. `pathname` is the page's own known
 * route — Server Components pass their static or params-built path;
 * Server Actions call this with no pathname (a direct POST/curl caller
 * has no "return to this page" concept, so this is pure defense-in-depth
 * there, matching the existing per-action pattern). Suspended/locked/
 * closed accounts are already caught here for free: src/lib/auth.ts's jwt
 * callback invalidates the token live the moment User.status isn't
 * ACTIVE, so `auth()` returns null for them exactly like a logged-out
 * visitor. */
export async function requireStudentSession(pathname?: string) {
  const session = await auth();
  if (!session) {
    redirect(pathname ? `/login?callbackUrl=${encodeURIComponent(pathname)}` : "/login");
  }
  return session;
}

/** Verifies the signed-in user actually purchased this international-exam
 * product (a one-time InternationalExamPurchase, not a Subscription plan —
 * see the model's own doc comment in schema.prisma). Redirects to Pricing
 * with a reason code the pricing page surfaces as a banner, rather than a
 * bare 404/403, so the user understands why and can act on it. */
export async function requireExamProductEntitlement(
  userId: string,
  product: InternationalExamProduct
) {
  const purchase = await prisma.internationalExamPurchase.findFirst({
    where: { userId, product, status: "SUCCESS" },
    select: { id: true },
  });
  if (!purchase) {
    redirect(`/pricing?reason=${product.toLowerCase()}_required#international-exam-prep`);
  }
}
