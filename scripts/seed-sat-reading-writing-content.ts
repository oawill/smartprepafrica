import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// No SAT admin content management exists yet (a later phase) — this seeds
// a small set of real, original Reading and Writing items the same way
// scripts/seed-toefl-reading-content.ts seeded TOEFL before its own admin
// tooling existed. All passages/questions are written from scratch for
// SmartPrepAfrica — never scraped or copied from College Board material.
const READING_WRITING_ITEMS = [
  {
    domain: "Information and Ideas",
    difficulty: "EASY" as const,
    passage:
      "A 2019 study of urban rivers found that reintroducing native aquatic plants along riverbanks reduced sediment runoff by nearly forty percent within two years. Researchers attributed the improvement to the plants' root systems, which stabilize soil that would otherwise wash into the water during heavy rain.",
    prompt: "Which choice best states the main finding of the text?",
    options: [
      { key: "A", text: "Native aquatic plants reduced riverbank sediment runoff by stabilizing soil with their roots." },
      { key: "B", text: "Urban rivers are more polluted than rural rivers." },
      { key: "C", text: "Heavy rain is the leading cause of river pollution worldwide." },
      { key: "D", text: "Researchers studied urban rivers for the first time in 2019." },
    ],
    correctOption: "A",
    explanation:
      "The text states that reintroducing native plants reduced runoff because their roots stabilize soil — matching A. B, C, and D are not claims made in the text.",
    estimatedTimeSec: 70,
    tags: ["information-and-ideas", "main-idea"],
  },
  {
    domain: "Craft and Structure",
    difficulty: "MEDIUM" as const,
    passage:
      "In her memoir, the aviator describes her first solo flight not as a moment of triumph but as one of quiet, almost clinical focus — every instrument check, every gust of wind, absorbed her full attention, leaving no room for elation until she had safely landed.",
    prompt: "As used in the text, the word \"clinical\" most nearly means",
    options: [
      { key: "A", text: "medical" },
      { key: "B", text: "detached and precise" },
      { key: "C", text: "emotional" },
      { key: "D", text: "hesitant" },
    ],
    correctOption: "B",
    explanation:
      "The passage contrasts \"triumph\"/\"elation\" with a focus on instrument checks and full attention — describing a detached, precise state of mind, matching B, not the medical sense of the word.",
    estimatedTimeSec: 60,
    tags: ["craft-and-structure", "words-in-context"],
  },
  {
    domain: "Expression of Ideas",
    difficulty: "MEDIUM" as const,
    passage:
      "The city council is considering two proposals to reduce traffic congestion downtown: expanding the light-rail line, and adding a congestion charge for vehicles entering the city center during peak hours. _______, transportation researchers point out that cities that combine both approaches see larger reductions in congestion than cities that adopt only one.",
    prompt: "Which choice completes the text with the most logical transition?",
    options: [
      { key: "A", text: "However" },
      { key: "B", text: "Notably" },
      { key: "C", text: "In contrast" },
      { key: "D", text: "Similarly" },
    ],
    correctOption: "B",
    explanation:
      "The second sentence adds a supporting research finding rather than contradicting or contrasting with the first — \"Notably\" logically introduces this additional point, matching B.",
    estimatedTimeSec: 65,
    tags: ["expression-of-ideas", "transitions"],
  },
  {
    domain: "Standard English Conventions",
    difficulty: "EASY" as const,
    passage:
      "The committee, along with its three subcommittees, _______ responsible for reviewing every grant application submitted before the March deadline.",
    prompt: "Which choice completes the text so that it conforms to the conventions of Standard English?",
    options: [
      { key: "A", text: "are" },
      { key: "B", text: "is" },
      { key: "C", text: "were" },
      { key: "D", text: "have been" },
    ],
    correctOption: "B",
    explanation:
      "The subject is the singular \"committee\" — the phrase \"along with its three subcommittees\" is a parenthetical modifier, not part of a compound subject, so the singular verb \"is\" is correct, matching B.",
    estimatedTimeSec: 55,
    tags: ["standard-english-conventions", "subject-verb-agreement"],
  },
  {
    domain: "Information and Ideas",
    difficulty: "HARD" as const,
    passage:
      "Economist Elinor Ostrom challenged the long-held assumption that shared resources — pastures, fisheries, irrigation systems — are inevitably overexploited unless privatized or regulated by a central authority. Her fieldwork across dozens of communities documented self-governing groups that had sustainably managed shared resources for generations through locally developed rules, monitoring, and graduated sanctions, without either privatization or top-down regulation.",
    prompt: "The text most strongly suggests which of the following about Ostrom's fieldwork?",
    options: [
      { key: "A", text: "It found that privatization is always necessary to prevent overexploitation of shared resources." },
      { key: "B", text: "It provided evidence that communities can sustainably self-govern shared resources without privatization or central regulation." },
      { key: "C", text: "It focused exclusively on fisheries in a single country." },
      { key: "D", text: "It concluded that central regulation is more effective than local rules." },
    ],
    correctOption: "B",
    explanation:
      "The text says her fieldwork documented groups managing resources sustainably \"through locally developed rules... without either privatization or top-down regulation\" — matching B directly; A and D state the opposite, and C overstates scope not given in the text.",
    estimatedTimeSec: 100,
    tags: ["information-and-ideas", "inference"],
  },
];

async function main() {
  for (const item of READING_WRITING_ITEMS) {
    const existing = await prisma.satContent.findFirst({
      where: { section: "READING_WRITING", prompt: item.prompt },
    });
    if (existing) {
      console.log(`Already seeded: ${item.domain} — ${item.prompt.slice(0, 40)}...`);
      continue;
    }
    await prisma.satContent.create({
      data: {
        section: "READING_WRITING",
        domain: item.domain,
        questionType: "MULTIPLE_CHOICE",
        difficulty: item.difficulty,
        status: "PUBLISHED",
        passage: item.passage,
        prompt: item.prompt,
        options: item.options,
        correctOption: item.correctOption,
        explanation: item.explanation,
        estimatedTimeSec: item.estimatedTimeSec,
        tags: item.tags,
      },
    });
    console.log(`Created: ${item.domain} — ${item.prompt.slice(0, 40)}...`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
