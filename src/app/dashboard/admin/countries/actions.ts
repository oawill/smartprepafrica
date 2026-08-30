"use server";

import { revalidatePath } from "next/cache";
import type { CountryStatus } from "@prisma/client";
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
