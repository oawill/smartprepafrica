import type { AdminRole } from "@prisma/client";
import { hasPermission, type Permission } from "@/lib/admin/permissions";
import { isToeflEnabled } from "@/lib/toefl/config";
import { isSatEnabled } from "@/lib/sat/config";

export type AdminNavItem = {
  label: string;
  href: string;
  permission?: Permission;
  requiresFlag?: "toefl" | "sat";
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "Dashboard",
    items: [{ label: "Overview", href: "/dashboard/admin" }],
  },
  {
    label: "Learning Content",
    items: [
      { label: "Questions", href: "/dashboard/admin/questions", permission: "questions.view" },
      { label: "Passages", href: "/dashboard/admin/passages", permission: "questions.view" },
      {
        label: "Bulk upload",
        href: "/dashboard/admin/questions/upload",
        permission: "questions.bulk_upload",
      },
      { label: "Subjects & topics", href: "/dashboard/admin/subjects", permission: "subjects.manage" },
    ],
  },
  {
    label: "Countries & Exams",
    items: [
      { label: "Countries", href: "/dashboard/admin/countries", permission: "countries.manage" },
      { label: "Exam bodies & exams", href: "/dashboard/admin/exams", permission: "exams.manage" },
    ],
  },
  {
    label: "Courses",
    items: [
      { label: "Schools", href: "/dashboard/admin/schools", permission: "schools.view" },
      { label: "Courses", href: "/dashboard/admin/courses", permission: "courses.view" },
      { label: "Tutor escalations", href: "/dashboard/admin/discussions", permission: "discussions.manage" },
    ],
  },
  {
    label: "Learning Management",
    items: [
      { label: "Curriculum & Class Levels", href: "/dashboard/admin/learning/curriculum", permission: "curriculum.manage" },
      { label: "Topics", href: "/dashboard/admin/learning/topics", permission: "lessons.view" },
      { label: "Lessons", href: "/dashboard/admin/learning/lessons", permission: "lessons.view" },
      { label: "Content review queue", href: "/dashboard/admin/learning/review", permission: "lessons.approve" },
      { label: "Learning analytics", href: "/dashboard/admin/learning/analytics", permission: "analytics.view" },
    ],
  },
  {
    label: "Video Learning Studio",
    items: [
      { label: "Dashboard", href: "/dashboard/admin/video-studio", permission: "video_studio.view" },
      { label: "Video Library", href: "/dashboard/admin/video-studio/library", permission: "video_studio.view" },
      { label: "Production Queue", href: "/dashboard/admin/video-studio/queue", permission: "video_studio.view" },
      { label: "Settings", href: "/dashboard/admin/video-studio/settings", permission: "video_studio.view" },
    ],
  },
  {
    label: "International Exams",
    items: [
      { label: "Overview", href: "/dashboard/admin/toefl", permission: "toefl.view", requiresFlag: "toefl" },
      { label: "Content", href: "/dashboard/admin/toefl/content", permission: "toefl.view", requiresFlag: "toefl" },
      { label: "Analytics", href: "/dashboard/admin/toefl/analytics", permission: "analytics.view", requiresFlag: "toefl" },
      { label: "SAT Overview", href: "/dashboard/admin/sat", permission: "sat.view", requiresFlag: "sat" },
      { label: "SAT Content", href: "/dashboard/admin/sat/content", permission: "sat.view", requiresFlag: "sat" },
      { label: "SAT Analytics", href: "/dashboard/admin/sat/analytics", permission: "analytics.view", requiresFlag: "sat" },
      { label: "Question Bank — Bulk Import", href: "/dashboard/admin/content-import", permission: "sat.bulk_import" },
    ],
  },
  {
    label: "Users",
    items: [
      { label: "Students", href: "/dashboard/admin/users/students", permission: "users.view" },
      { label: "Parents", href: "/dashboard/admin/users/parents", permission: "users.view" },
      { label: "Teachers", href: "/dashboard/admin/users/teachers", permission: "users.view" },
      {
        label: "School admins",
        href: "/dashboard/admin/users/school-admins",
        permission: "users.view",
      },
      { label: "Sponsors", href: "/dashboard/admin/users/sponsors", permission: "users.view" },
      { label: "Administrators", href: "/dashboard/admin/admins", permission: "admins.create" },
    ],
  },
  {
    label: "AI Coach",
    items: [{ label: "Usage & costs", href: "/dashboard/admin/ai", permission: "analytics.view" }],
  },
  {
    label: "Readiness & Drills",
    items: [
      { label: "Settings", href: "/dashboard/admin/readiness/settings", permission: "readiness.manage" },
      { label: "Analytics", href: "/dashboard/admin/readiness/analytics", permission: "readiness.view" },
    ],
  },
  {
    label: "Partners",
    items: [
      { label: "Applications & partners", href: "/dashboard/admin/partners", permission: "partners.view" },
      { label: "Payouts", href: "/dashboard/admin/payouts", permission: "partners.payout" },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Transactions", href: "/dashboard/admin/finance", permission: "payments.view" },
    ],
  },
  {
    label: "Support",
    items: [{ label: "Contact messages", href: "/dashboard/admin/support", permission: "support.manage" }],
  },
  {
    label: "Security",
    items: [
      { label: "Login activity", href: "/dashboard/admin/security/login-activity", permission: "security.view" },
      { label: "Audit log", href: "/dashboard/admin/security/audit-log", permission: "audit.view" },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Platform settings", href: "/dashboard/admin/settings", permission: "settings.update" },
      { label: "Legal content", href: "/dashboard/admin/legal", permission: "legal.update" },
    ],
  },
];

export function navForAdminRole(adminRole: AdminRole | null | undefined): AdminNavGroup[] {
  return ADMIN_NAV.filter((group) => group.label !== "International Exams" || isToeflEnabled() || isSatEnabled())
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.requiresFlag === "toefl" && !isToeflEnabled()) return false;
        if (item.requiresFlag === "sat" && !isSatEnabled()) return false;
        return !item.permission || hasPermission(adminRole, item.permission);
      }),
    }))
    .filter((group) => group.items.length > 0);
}
