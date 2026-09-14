// Phase 5 §15 — a fixed, well-known set of funding-category tags. Not a
// full admin-editable category manager (kept simple for this pass); a
// developer can extend this list directly.
export const FUNDING_CATEGORIES = [
  "Education",
  "Education Access",
  "EdTech",
  "AI in Education",
  "Digital Inclusion",
  "Youth Development",
  "Secondary Education",
  "STEM",
  "Girls' Education",
  "Teacher Development",
  "School Technology",
  "Africa",
  "Nigeria",
  "Entrepreneurship",
  "Social Impact",
  "Digital Transformation",
] as const;
