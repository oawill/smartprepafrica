// One-off, safe-to-rerun backfill: gives every existing user a UserRole row
// matching their current (single) User.role, so the new table starts in
// sync with reality. Purely additive — createMany + skipDuplicates means
// re-running this is a no-op for users that already have their row.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, role: true } });

  const result = await prisma.userRole.createMany({
    data: users.map((u) => ({ userId: u.id, role: u.role })),
    skipDuplicates: true,
  });

  console.log(`Backfilled ${result.count} UserRole row(s) for ${users.length} user(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
