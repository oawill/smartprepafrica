import { prisma } from "@/lib/prisma";

/** Nigeria's states + FCT, sourced from the Region table (seeded via
 * scripts/seed-regions.ts) instead of a hardcoded array — see
 * docs/audit.md §5 for the migration this replaced. */
export async function getNigerianStates(): Promise<string[]> {
  const regions = await prisma.region.findMany({
    where: { country: { code: "NG" } },
    orderBy: { name: "asc" },
    select: { name: true },
  });
  return regions.map((r) => r.name);
}

/** States highlighted on the homepage's "Explore by state" links. */
export async function getFeaturedNigerianStates(): Promise<string[]> {
  const regions = await prisma.region.findMany({
    where: { country: { code: "NG" }, featured: true },
    orderBy: { name: "asc" },
    select: { name: true },
  });
  return regions.map((r) => r.name);
}
