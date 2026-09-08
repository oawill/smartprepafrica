"use server";

import { revalidatePath } from "next/cache";
import type { CountryStatus, SubscriptionPlan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";

export async function createCountry(formData: FormData) {
  const session = await requireActionPermission("countries.manage");

  const name = (formData.get("name") as string)?.trim();
  const code = (formData.get("code") as string)?.trim().toUpperCase();
  const currency = (formData.get("currency") as string)?.trim().toUpperCase();
  const currencySymbol = (formData.get("currencySymbol") as string)?.trim();
  const flag = (formData.get("flag") as string)?.trim();
  const timezone = (formData.get("timezone") as string)?.trim();
  if (!name || !code || !currency || !currencySymbol || !flag || !timezone) {
    throw new Error("Name, code, currency, currency symbol, flag, and timezone are all required.");
  }

  const country = await prisma.country.create({
    data: { name, code, currency, currencySymbol, flag, timezone },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "COUNTRY_CREATED",
    resourceType: "Country",
    resourceId: country.id,
    result: "SUCCESS",
    after: { name, code, currency, status: country.status },
  });
  revalidatePath("/dashboard/admin/countries");
}

export async function updateCountryStatus(formData: FormData) {
  const session = await requireActionPermission("countries.manage");

  const id = formData.get("id") as string;
  const status = formData.get("status") as CountryStatus;
  if (!id || !status) throw new Error("Country and status are required.");

  const before = await prisma.country.findUniqueOrThrow({ where: { id } });
  await prisma.country.update({ where: { id }, data: { status } });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "COUNTRY_STATUS_CHANGED",
    resourceType: "Country",
    resourceId: id,
    result: "SUCCESS",
    before: { status: before.status },
    after: { status },
  });
  revalidatePath("/dashboard/admin/countries");
}

/** Sets (or replaces) this country's override price for one plan — the row
 * resolvePlanPrice() checks first, ahead of the hardcoded Nigeria default in
 * PLAN_PRICING_KOBO. Monthly billing only, matching resolvePlanPrice's own
 * scope (per-interval country pricing isn't supported yet). */
export async function upsertCountryPlanPrice(formData: FormData) {
  const session = await requireActionPermission("countries.manage");

  const countryId = formData.get("countryId") as string;
  const plan = formData.get("plan") as SubscriptionPlan;
  const currency = (formData.get("currency") as string)?.trim().toUpperCase();
  const priceNaira = Number(formData.get("price"));
  if (!countryId || !plan || !currency || !Number.isFinite(priceNaira) || priceNaira <= 0) {
    throw new Error("Country, plan, currency, and a positive price are all required.");
  }
  const priceMinor = Math.round(priceNaira * 100);

  const before = await prisma.countryPlanPrice.findUnique({
    where: { countryId_plan: { countryId, plan } },
  });

  const row = await prisma.countryPlanPrice.upsert({
    where: { countryId_plan: { countryId, plan } },
    update: { priceMinor, currency },
    create: { countryId, plan, priceMinor, currency },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "COUNTRY_PLAN_PRICE_SET",
    resourceType: "CountryPlanPrice",
    resourceId: row.id,
    result: "SUCCESS",
    before: before ? { priceMinor: before.priceMinor, currency: before.currency } : null,
    after: { priceMinor, currency },
  });
  revalidatePath("/dashboard/admin/countries");
}

/** Removes this country's override for one plan, so resolvePlanPrice()
 * falls back to the hardcoded Nigeria default (PLAN_PRICING_KOBO). */
export async function clearCountryPlanPrice(formData: FormData) {
  const session = await requireActionPermission("countries.manage");

  const countryId = formData.get("countryId") as string;
  const plan = formData.get("plan") as SubscriptionPlan;
  if (!countryId || !plan) throw new Error("Country and plan are required.");

  const before = await prisma.countryPlanPrice.findUnique({
    where: { countryId_plan: { countryId, plan } },
  });
  if (!before) return;

  await prisma.countryPlanPrice.delete({ where: { countryId_plan: { countryId, plan } } });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "COUNTRY_PLAN_PRICE_CLEARED",
    resourceType: "CountryPlanPrice",
    resourceId: before.id,
    result: "SUCCESS",
    before: { priceMinor: before.priceMinor, currency: before.currency },
    after: null,
  });
  revalidatePath("/dashboard/admin/countries");
}
