import type { AdminRole } from "@prisma/client";

export type Permission =
  | "questions.view"
  | "questions.create"
  | "questions.edit"
  | "questions.approve"
  | "questions.publish"
  | "questions.archive"
  | "questions.bulk_upload"
  | "exams.manage"
  | "subjects.manage"
  | "courses.view"
  | "courses.approve"
  | "curriculum.manage"
  | "lessons.view"
  | "lessons.edit"
  | "lessons.approve"
  | "lessons.publish"
  | "schools.view"
  | "schools.approve"
  | "users.view"
  | "users.suspend"
  | "partners.view"
  | "partners.approve"
  | "partners.payout"
  | "payments.view"
  | "payments.refund"
  | "admins.create"
  | "roles.manage"
  | "security.view"
  | "sessions.revoke"
  | "audit.view"
  | "audit.export"
  | "settings.update"
  | "branding.update"
  | "legal.update"
  | "support.manage"
  | "analytics.view"
  | "countries.manage"
  | "video_studio.view"
  | "video_studio.create"
  | "video_studio.review"
  | "toefl.view"
  | "toefl.create"
  | "toefl.review"
  | "toefl.publish"
  | "toefl.archive";

const ALL_PERMISSIONS: Permission[] = [
  "questions.view",
  "questions.create",
  "questions.edit",
  "questions.approve",
  "questions.publish",
  "questions.archive",
  "questions.bulk_upload",
  "exams.manage",
  "subjects.manage",
  "courses.view",
  "courses.approve",
  "curriculum.manage",
  "lessons.view",
  "lessons.edit",
  "lessons.approve",
  "lessons.publish",
  "schools.view",
  "schools.approve",
  "users.view",
  "users.suspend",
  "partners.view",
  "partners.approve",
  "partners.payout",
  "payments.view",
  "payments.refund",
  "admins.create",
  "roles.manage",
  "security.view",
  "sessions.revoke",
  "audit.view",
  "audit.export",
  "settings.update",
  "branding.update",
  "legal.update",
  "support.manage",
  "analytics.view",
  "countries.manage",
  "video_studio.view",
  "video_studio.create",
  "video_studio.review",
  "toefl.view",
  "toefl.create",
  "toefl.review",
  "toefl.publish",
  "toefl.archive",
];

/** Every AdminRole must appear here. A user with role=ADMIN but adminRole=null
 * (not yet assigned by a Super Admin) gets zero permissions. */
export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  PLATFORM_ADMIN: ALL_PERMISSIONS.filter((p) => p !== "admins.create" && p !== "roles.manage"),
  CONTENT_ADMIN: [
    "questions.view",
    "questions.create",
    "questions.edit",
    "questions.publish",
    "questions.archive",
    "questions.bulk_upload",
    "exams.manage",
    "subjects.manage",
    "courses.view",
    "curriculum.manage",
    "lessons.view",
    "lessons.edit",
    "lessons.publish",
    "video_studio.view",
    "video_studio.create",
    "toefl.view",
    "toefl.create",
    "toefl.review",
    "toefl.publish",
    "toefl.archive",
  ],
  CONTENT_REVIEWER: [
    "questions.view",
    "questions.approve",
    "questions.publish",
    "questions.archive",
    "courses.view",
    "courses.approve",
    "lessons.view",
    "lessons.approve",
    "lessons.publish",
    "video_studio.view",
    "video_studio.review",
    "toefl.view",
    "toefl.review",
    "toefl.archive",
  ],
  SCHOOL_SUPPORT_ADMIN: ["schools.view", "schools.approve", "users.view", "courses.view", "courses.approve"],
  USER_SUPPORT_ADMIN: ["users.view", "users.suspend", "support.manage", "sessions.revoke"],
  FINANCE_ADMIN: ["payments.view", "payments.refund", "partners.payout", "analytics.view"],
  PARTNER_ADMIN: ["partners.view", "partners.approve", "partners.payout", "analytics.view"],
  SECURITY_ADMIN: ["security.view", "sessions.revoke", "audit.view", "audit.export", "users.view", "users.suspend"],
  ANALYST: ["analytics.view", "questions.view", "courses.view", "schools.view", "users.view", "toefl.view"],
};

export function permissionsFor(adminRole: AdminRole | null | undefined): Permission[] {
  if (!adminRole) return [];
  return ROLE_PERMISSIONS[adminRole] ?? [];
}

export function hasPermission(
  adminRole: AdminRole | null | undefined,
  permission: Permission
): boolean {
  return permissionsFor(adminRole).includes(permission);
}

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super Admin",
  PLATFORM_ADMIN: "Platform Admin",
  CONTENT_ADMIN: "Content Admin",
  CONTENT_REVIEWER: "Content Reviewer",
  SCHOOL_SUPPORT_ADMIN: "School Support Admin",
  USER_SUPPORT_ADMIN: "User Support Admin",
  FINANCE_ADMIN: "Finance Admin",
  PARTNER_ADMIN: "Partner Admin",
  SECURITY_ADMIN: "Security Admin",
  ANALYST: "Analyst",
};
