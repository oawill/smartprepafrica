import type { Role } from "@prisma/client";

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

const defaultNav: NavItem[] = [
  { label: "Overview", href: "" }, // href filled in with roleDashboardPath at use-site
  { label: "Exam practice", href: "/practice" },
  { label: "Courses", href: "/educom" },
  { label: "Plans & billing", href: "/pricing" },
];

// Students get the Learn -> Practice -> Review flow called out in the
// EduCom spec; other roles keep the general dashboard nav for now.
const studentNav: NavItem[] = [
  { label: "Home", href: "" },
  { label: "Learn", href: "/educom" },
  { label: "Practice", href: "/practice" },
  { label: "Review", href: "/practice/history" },
  { label: "Plans & billing", href: "/pricing" },
];

const partnerNav: NavItem[] = [
  { label: "Dashboard", href: "" },
  { label: "My Students", href: "/dashboard/partner/students" },
  { label: "Campaigns", href: "/dashboard/partner/campaigns" },
  { label: "Marketing", href: "/dashboard/partner/marketing" },
  { label: "Earnings", href: "/dashboard/partner/earnings" },
  { label: "Payouts", href: "/dashboard/partner/payouts" },
  { label: "Leaderboard", href: "/dashboard/partner/leaderboard" },
  { label: "Profile", href: "/dashboard/partner/profile" },
];

export function navForRole(role: Role): NavItem[] {
  const items = role === "STUDENT" ? studentNav : role === "PARTNER" ? partnerNav : defaultNav;
  return items.map((item) =>
    item.href === "" ? { ...item, href: roleDashboardPath[role] } : item
  );
}
