import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Mirrors PLAN_PRICING_KOBO in src/lib/plans.ts exactly, so wiring
// CountryPlanPrice into checkout is a provable no-op for Nigeria's existing
// live pricing.
const PRICES = [
  { plan: "BASIC" as const, priceMinor: 150_000 },
  { plan: "PREMIUM" as const, priceMinor: 350_000 },
];

async function main() {
  const nigeria = await prisma.country.findUniqueOrThrow({ where: { code: "NG" } });

  for (const { plan, priceMinor } of PRICES) {
    await prisma.countryPlanPrice.upsert({
      where: { countryId_plan: { countryId: nigeria.id, plan } },
      update: {},
      create: { countryId: nigeria.id, plan, priceMinor, currency: "NGN" },
    });
  }
  console.log(`Upserted ${PRICES.length} Nigeria CountryPlanPrice rows.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
