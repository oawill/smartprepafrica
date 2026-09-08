import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Source of truth for Nigeria's states + FCT — was previously a hardcoded
// array in src/lib/nigerian-states.ts, which now reads from the Region
// table this seeds instead. Exported so tests/geo/region.test.ts can assert
// against it without a third copy of the list.
export const NIGERIA_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT",
  "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
  "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

// Was previously a separate, out-of-sync hardcoded array
// (discoveryStates in src/app/page.tsx) — major population centers,
// editorial curation, not derived from any metric.
const FEATURED_STATES = new Set(["Lagos", "Rivers", "Kano", "FCT", "Oyo", "Enugu"]);

async function main() {
  const nigeria = await prisma.country.findUniqueOrThrow({ where: { code: "NG" } });

  let count = 0;
  for (const name of NIGERIA_STATES) {
    await prisma.region.upsert({
      where: { countryId_name: { countryId: nigeria.id, name } },
      update: { featured: FEATURED_STATES.has(name) },
      create: { countryId: nigeria.id, name, featured: FEATURED_STATES.has(name) },
    });
    count += 1;
  }
  console.log(`Upserted ${count} Region rows for Nigeria (${FEATURED_STATES.size} featured).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
