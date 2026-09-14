import type { EducationAccessInterest, EducationAccessPackage } from "@prisma/client";

export type SponsorPackage = {
  id: EducationAccessPackage;
  name: string;
  body: string;
  items: string[];
  interest: EducationAccessInterest;
  estimatedStudents?: number;
  cta: string;
};

// "Choose Your Impact" — count-based sponsorship tiers shown on
// /education-access. Deliberately no pricing: sponsorship amounts are
// agreed directly with each sponsor, not fixed on-platform. Shared by the
// public page and the sponsorship form so copy and enum values can't
// drift apart.
export const SPONSOR_PACKAGES: SponsorPackage[] = [
  {
    id: "STUDENT_SPONSOR",
    name: "Sponsor 1 Student",
    body: "Fund SmartPrepAfrica access for one individual student.",
    items: [
      "SmartPrepAfrica learning access",
      "Exam preparation",
      "Practice questions and drills",
      "Study guides",
      "AI-supported learning access where applicable",
    ],
    interest: "SPONSOR_STUDENT",
    estimatedStudents: 1,
    cta: "Sponsor 1 Student",
  },
  {
    id: "CLASSROOM_SPONSOR",
    name: "Sponsor 10 Students",
    body: "For families, small businesses, alumni groups, and community organizations ready to support a small group of students.",
    items: [
      "SmartPrepAfrica learning access for 10 students",
      "Exam preparation",
      "Practice questions and drills",
      "Study guides",
      "AI-supported learning access where applicable",
    ],
    interest: "SPONSOR_STUDENT",
    estimatedStudents: 10,
    cta: "Sponsor 10 Students",
  },
  {
    id: "SCHOOL_PARTNER",
    name: "Sponsor 50 Students",
    body: "For companies, NGOs, diaspora associations, and community groups ready to support a larger cohort of students.",
    items: [
      "SmartPrepAfrica learning access for 50 students",
      "Exam preparation",
      "Practice questions and drills",
      "Study guides",
      "AI-supported learning access where applicable",
    ],
    interest: "SPONSOR_STUDENT",
    estimatedStudents: 50,
    cta: "Sponsor 50 Students",
  },
  {
    id: "COMMUNITY_CHAMPION",
    name: "Sponsor a Classroom",
    body: "Sponsor a defined classroom or student cohort — the number of students is confirmed together based on the group you want to support.",
    items: ["SmartPrepAfrica learning access for the classroom", "Exam preparation", "Digital learning resources"],
    interest: "SPONSOR_STUDENT",
    cta: "Sponsor a Classroom",
  },
  {
    id: "FLAGSHIP_AI_TUTOR",
    name: "Sponsor a School",
    body: "A larger institutional partnership supporting a full partner school.",
    items: [
      "Student access",
      "Teacher participation where applicable",
      "Exam-preparation resources",
      "Digital learning resources",
      "Impact reporting",
    ],
    interest: "SPONSOR_SCHOOL",
    cta: "Sponsor a School",
  },
  {
    id: "CUSTOM",
    name: "Custom Partnership",
    body: "For foundations, corporations, governments, NGOs, and large institutional sponsors with their own program goals.",
    items: [],
    interest: "FOUNDATION_PARTNERSHIP",
    cta: "Discuss a Partnership",
  },
];

export function findSponsorPackage(id: string | undefined): SponsorPackage | undefined {
  return SPONSOR_PACKAGES.find((pkg) => pkg.id === id);
}
