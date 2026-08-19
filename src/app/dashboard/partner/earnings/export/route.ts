import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "PARTNER") {
    return new Response("Unauthorized", { status: 401 });
  }

  const partner = await prisma.partner.findUnique({ where: { userId: session.user.id } });
  if (!partner || partner.status !== "APPROVED") {
    return new Response("Not an approved partner", { status: 403 });
  }

  const period = request.nextUrl.searchParams.get("period") ?? "this_month";
  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");

  const now = new Date();
  let from = new Date(now.getFullYear(), now.getMonth(), 1);
  let to = now;
  if (period === "last_month") {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    to = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === "quarter") {
    from = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  } else if (period === "year") {
    from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  } else if (period === "custom" && fromParam && toParam) {
    from = new Date(fromParam);
    to = new Date(toParam);
  }

  const commissions = await prisma.partnerCommission.findMany({
    where: { partnerId: partner.id, createdAt: { gte: from, lte: to } },
    orderBy: { createdAt: "desc" },
  });

  const header = "Commission Number,Event Type,Amount (NGN),Status,Date\n";
  const rows = commissions
    .map((c) =>
      [
        c.commissionNumber,
        c.eventType,
        (c.amountKobo / 100).toFixed(2),
        c.status,
        c.createdAt.toISOString(),
      ].join(",")
    )
    .join("\n");

  return new NextResponse(header + rows, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="earnings-${period}.csv"`,
    },
  });
}
