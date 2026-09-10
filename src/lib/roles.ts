import type { Role } from "@prisma/client";
import { isToeflEnabled } from "@/lib/toefl/config";
import { isSatEnabled } from "@/lib/sat/config";
import type { Dictionary } from "@/lib/i18n/messages/en";

export const roleDashboardPath: Record<Role, string> = {
  STUDENT: "/dashboard/student",
  PARENT: "/dashboard/parent",
  SCHOOL_ADMIN: "/dashboard/school",
  TEACHER: "/dashboard/teacher",
  SPONSOR: "/dashboard/sponsor",
  PARTNER: "/dashboard/partner",
  ADMIN: "/dashboard/admin",
};

export const roleLabel: Record<Role, string> = {
  STUDENT: "Student",
  PARENT: "Parent",
  SCHOOL_ADMIN: "School",
  TEACHER: "Teacher",
  SPONSOR: "Sponsor",
  PARTNER: "Partner",
  ADMIN: "Admin",
};

export type NavItem = { label: string; href: string };

const defaultNav = (t: Dictionary["dashboardNav"]): NavItem[] => [
  { label: t.overview, href: "" }, // href filled in with roleDashboardPath at use-site
  { label: t.prep, href: "/practice" },
  { label: t.learning, href: "/learn" },
  { label: t.plansAndBilling, href: "/pricing" },
];

// Students get the Prep -> Learning -> Review flow; other roles keep the
// general dashboard nav for now.
const studentNav = (t: Dictionary["dashboardNav"]): NavItem[] => [
  { label: t.home, href: "" },
  { label: t.prep, href: "/practice" },
  { label: t.learning, href: "/learn" },
  { label: t.review, href: "/practice/history" },
  { label: t.plansAndBilling, href: "/pricing" },
];

const partnerNav = (t: Dictionary["dashboardNav"]): NavItem[] => [
  { label: t.dashboard, href: "" },
  { label: t.myStudents, href: "/dashboard/partner/students" },
  { label: t.campaigns, href: "/dashboard/partner/campaigns" },
  { label: t.marketing, href: "/dashboard/partner/marketing" },
  { label: t.earnings, href: "/dashboard/partner/earnings" },
  { label: t.payouts, href: "/dashboard/partner/payouts" },
  { label: t.leaderboard, href: "/dashboard/partner/leaderboard" },
  { label: t.profile, href: "/dashboard/partner/profile" },
];

export function navForRole(role: Role, t: Dictionary["dashboardNav"]): NavItem[] {
  const base = role === "STUDENT" ? studentNav(t) : role === "PARTNER" ? partnerNav(t) : defaultNav(t);
  let items = base;
  if (role === "STUDENT" && isToeflEnabled()) {
    items = [...items, { label: t.toefl, href: "/international-exams/toefl" }];
  }
  if (role === "STUDENT" && isSatEnabled()) {
    items = [...items, { label: t.sat, href: "/international-exams/sat" }];
  }
  return items.map((item) =>
    item.href === "" ? { ...item, href: roleDashboardPath[role] } : item
  );
}
