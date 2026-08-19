import type { Role } from "@prisma/client";
import { notFound } from "next/navigation";

const SLUG_TO_ROLE: Record<string, Role> = {
  students: "STUDENT",
  parents: "PARENT",
  teachers: "TEACHER",
  "school-admins": "SCHOOL_ADMIN",
  sponsors: "SPONSOR",
};

export const ROLE_SLUG_LABEL: Record<string, string> = {
  students: "Students",
  parents: "Parents",
  teachers: "Teachers",
  "school-admins": "School admins",
  sponsors: "Sponsors",
};

export function roleFromSlug(slug: string): Role {
  const role = SLUG_TO_ROLE[slug];
  if (!role) notFound();
  return role;
}
