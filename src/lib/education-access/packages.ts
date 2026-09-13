import type { EducationAccessInterest, EducationAccessPackage } from "@prisma/client";

export type SponsorPackage = {
  id: EducationAccessPackage;
  name: string;
  suggestedAmount: string;
  body: string;
  interest: EducationAccessInterest;
  estimatedStudents?: number;
};

// Suggested giving tiers shown on /education-access — informational only,
// never charged on-platform (sponsor funding happens off-platform). Shared
// by the public page and the inquiry form so copy and enum values can't
// drift apart.
export const SPONSOR_PACKAGES: SponsorPackage[] = [
  {
    id: "STUDENT_SPONSOR",
    name: "Student Sponsor",
    suggestedAmount: "$60 / student / term",
    body: "Full SmartPrepAfrica access — exam prep, AI Study Coach, digital lessons — for one student for one academic term.",
    interest: "SPONSOR_STUDENT",
  },
  {
    id: "CLASSROOM_SPONSOR",
    name: "Classroom Sponsor",
    suggestedAmount: "$500",
    body: "Covers a full classroom of approximately 10 students for one term.",
    interest: "SPONSOR_STUDENT",
    estimatedStudents: 10,
  },
  {
    id: "SCHOOL_PARTNER",
    name: "School Partner",
    suggestedAmount: "$2,500 / year",
    body: "Covers a full partner school — roughly 50 students — for a full academic year, plus school-level reporting.",
    interest: "SPONSOR_SCHOOL",
    estimatedStudents: 50,
  },
  {
    id: "COMMUNITY_CHAMPION",
    name: "Community Champion",
    suggestedAmount: "$10,000+",
    body: "Supports students across a community, LGA, or targeted region — scope confirmed together based on your goals.",
    interest: "SPONSOR_COMMUNITY",
  },
  {
    id: "FLAGSHIP_AI_TUTOR",
    name: "Flagship Partner",
    suggestedAmount: "Major gift",
    body: "Become a named partner on the AI Tutor for 10,000 Students flagship program.",
    interest: "AI_TUTOR_10K",
  },
  {
    id: "CUSTOM",
    name: "Design a Custom Package",
    suggestedAmount: "Let's talk",
    body: "Every organization's giving goals are different — tell us what you'd like to achieve and we'll design a package together.",
    interest: "OTHER",
  },
];

export function findSponsorPackage(id: string | undefined): SponsorPackage | undefined {
  return SPONSOR_PACKAGES.find((pkg) => pkg.id === id);
}
