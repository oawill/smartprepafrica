import { prisma } from "@/lib/prisma";

/** Only an ACTIVE country is a valid choice — this is the enforcement
 * point for "don't expose a country until Admin activates it" even if a
 * client somehow submits a Draft country's code. Falls back to Nigeria
 * (the default market) when no code is sent or it doesn't resolve.
 * Shared by /api/register and the phone-otp NextAuth provider. */
export async function resolveRegistrationCountry(countryCode?: string) {
  return (
    (countryCode && (await prisma.country.findFirst({ where: { code: countryCode, status: "ACTIVE" } }))) ||
    (await prisma.country.findFirst({ where: { code: "NG" } }))
  );
}
