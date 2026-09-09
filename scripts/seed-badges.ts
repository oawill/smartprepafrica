import { PrismaClient } from "@prisma/client";
import { BADGE_CATALOG } from "../src/lib/gamification/badges";

const prisma = new PrismaClient();

async function main() {
  let count = 0;
  for (const entry of BADGE_CATALOG) {
    await prisma.badge.upsert({
      where: { name: entry.name },
      update: { description: entry.description },
      create: { name: entry.name, description: entry.description },
    });
    count += 1;
  }
  console.log(`Upserted ${count} Badge rows.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
