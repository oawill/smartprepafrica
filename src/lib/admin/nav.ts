import type { AdminRole } from "@prisma/client";
import { hasPermission, type Permission } from "@/lib/admin/permissions";

export type AdminNavItem = {
  label: string;
  href: string;
  permission?: Permission;
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
      {
        label: "Bulk upload",
        href: "/dashboard/admin/questions/upload",
        permission: "questions.bulk_upload",
      },
      { label: "Subjects & topics", href: "/dashboard/admin/subjects", permission: "subjects.manage" },
    ],
  },
  {
    label: "Courses",
    items: [
      { label: "Schools", href: "/dashboard/admin/schools", permission: "schools.view" },
      { label: "Courses", href: "/dashboard/admin/courses", permission: "courses.view" },
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
  return ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || hasPermission(adminRole, item.permission)),
  })).filter((group) => group.items.length > 0);
}
