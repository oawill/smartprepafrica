// One-off backfill: existing ParentStudentLink rows predate the status
// lifecycle and were created via the old no-consent instant-link flow. They
// already represent established, currently-working parent relationships in
// production, so default them to ACTIVE rather than silently revoking real
// parents' access — the new PENDING default only applies to rows created
// from now on via the consent-based requestChildLink flow.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.parentStudentLink.updateMany({
    where: { status: "PENDING" },
    data: { status: "ACTIVE" },
  });
  console.log(`Backfilled ${result.count} pre-existing ParentStudentLink row(s) to ACTIVE.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
