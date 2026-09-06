import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// TOEFL admin content management doesn't exist yet (that's Step 11) — this
// seeds a small set of real, original Reading practice content the same
// way VLS seeded its one pilot topic before its own admin tooling existed
// (scripts/seed-vls-chemistry-topic.ts). All passages/questions here are
// written from scratch for SmartPrepAfrica, not sourced from ETS/official
// TOEFL material.
const READING_ITEMS = [
  {
    slug: "toefl-reading-001",
    difficulty: "EASY" as const,
    passage:
      "Urban beekeeping has grown rapidly in cities across the world over the past two decades. Once considered impractical, keeping honeybee colonies on rooftops and in small gardens is now actively encouraged by many municipal governments. Proponents argue that city bees benefit from a longer flowering season than their rural counterparts, since ornamental gardens and street trees bloom at different times throughout the year, giving bees consistent access to nectar. Urban environments are also frequently free of the large-scale pesticide use common in agricultural areas, which can otherwise weaken or kill bee colonies. Critics, however, caution that packing too many hives into a small area can create competition for limited floral resources, potentially harming both managed honeybee populations and wild native pollinators that share the same food sources.",
    prompt: "According to the passage, what is one advantage that urban beekeeping may have over rural beekeeping?",
    options: [
      { key: "A", text: "Cities provide access to a wider variety of flowering plants throughout the year." },
      { key: "B", text: "Urban bees produce more honey per colony than rural bees." },
      { key: "C", text: "City governments provide free hives to beekeepers." },
      { key: "D", text: "Urban beekeeping requires less maintenance than rural beekeeping." },
    ],
    correctOption: "A",
    explanation:
      "The passage states that ornamental gardens and street trees bloom at different times, giving city bees a longer flowering season and consistent access to nectar — this matches option A. The passage never discusses honey yield, free hives, or maintenance levels.",
    estimatedTimeSec: 90,
    tags: ["environment", "science"],
  },
  {
    slug: "toefl-reading-002",
    difficulty: "MEDIUM" as const,
    passage:
      "The concept of the \"sharing economy\" describes a marketplace in which individuals rent out underused assets — a spare room, a car, a set of tools — directly to other individuals, typically through an online platform that handles payment and coordination. Supporters contend that this model reduces waste by allowing existing resources to be used more fully rather than requiring the purchase of new goods, and that it can generate meaningful supplemental income for participants. Skeptics, however, note that many so-called sharing platforms function less like community-based sharing and more like conventional short-term rental businesses, with a small number of professional operators controlling a disproportionate share of the listings. This has led some cities to introduce regulations limiting how many properties a single host may list, in an effort to preserve the model's original peer-to-peer character and prevent housing from being diverted away from long-term residents.",
    prompt: "Why have some cities introduced regulations limiting the number of listings a single host may control?",
    options: [
      { key: "A", text: "To increase tax revenue from short-term rentals." },
      { key: "B", text: "To prevent professional operators from dominating the market and reducing long-term housing supply." },
      { key: "C", text: "To require all hosts to use the same online platform." },
      { key: "D", text: "To encourage more people to buy new goods instead of renting them." },
    ],
    correctOption: "B",
    explanation:
      "The passage explains that regulations were introduced 'to preserve the model's original peer-to-peer character and prevent housing from being diverted away from long-term residents,' directly matching option B.",
    estimatedTimeSec: 100,
    tags: ["economics", "society"],
  },
  {
    slug: "toefl-reading-003",
    difficulty: "MEDIUM" as const,
    passage:
      "Coral reefs, though they occupy less than one percent of the ocean floor, support an estimated twenty-five percent of all marine species at some stage of their life cycle. This disproportionate biodiversity arises largely from the structural complexity reefs provide: their branching, cavity-filled architecture offers countless microhabitats for organisms ranging from microscopic algae to large predatory fish. Reef-building corals themselves are colonial animals that live in a mutually beneficial relationship with photosynthetic algae called zooxanthellae, which live within the coral's tissue and supply it with the majority of its energy in exchange for a protected environment and access to sunlight. When ocean temperatures rise even slightly above normal for an extended period, corals often expel these algae in a stress response known as bleaching; a coral can survive a bleaching event, but if the stressful conditions persist, the coral will eventually starve without its algal partner.",
    prompt: "Based on the passage, what is the primary reason coral bleaching can lead to a coral's death?",
    options: [
      { key: "A", text: "Bleaching directly damages the coral's protective outer skeleton." },
      { key: "B", text: "The coral loses the algae that supply most of its energy." },
      { key: "C", text: "Bleaching attracts predatory fish that consume the coral." },
      { key: "D", text: "Rising temperatures dissolve the coral's calcium structure." },
    ],
    correctOption: "B",
    explanation:
      "The passage states that zooxanthellae 'supply it with the majority of its energy' and that a coral 'will eventually starve without its algal partner' if bleaching persists — the cause of death is loss of the energy-supplying algae, matching option B.",
    estimatedTimeSec: 100,
    tags: ["science", "environment"],
  },
  {
    slug: "toefl-reading-004",
    difficulty: "HARD" as const,
    passage:
      "Behavioral economists have long documented a phenomenon known as the \"sunk cost fallacy,\" in which individuals continue investing time, money, or effort into a failing course of action because of resources already committed, rather than basing the decision on future costs and benefits alone. Classical economic theory holds that sunk costs are, by definition, irrecoverable and therefore irrelevant to rational decision-making; only prospective costs and benefits should influence a choice going forward. Yet experimental studies consistently show that people weigh past investment heavily, even when explicitly told to disregard it. Some researchers argue this behavior is not simply irrational but may reflect an evolved aversion to waste, or a social desire to appear consistent and avoid admitting error to oneself or others. Others suggest that in organizational settings, continued investment in a failing project may be driven less by individual psychology than by structural incentives: a manager who champions a project has a professional stake in its apparent success that persists independently of the project's actual prospects.",
    prompt: "According to the passage, what alternative explanation do some researchers offer for continued investment in failing organizational projects, beyond individual psychological bias?",
    options: [
      { key: "A", text: "Managers are simply unaware of classical economic theory." },
      { key: "B", text: "Organizations lack the accounting tools to measure sunk costs accurately." },
      { key: "C", text: "A manager's professional stake in a project's apparent success can persist regardless of the project's real prospects." },
      { key: "D", text: "Employees are financially rewarded for continuing failing projects." },
    ],
    correctOption: "C",
    explanation:
      "The passage states that continued investment 'may be driven less by individual psychology than by structural incentives: a manager who champions a project has a professional stake in its apparent success that persists independently of the project's actual prospects' — matching option C.",
    estimatedTimeSec: 110,
    tags: ["economics", "psychology"],
  },
  {
    slug: "toefl-reading-005",
    difficulty: "EASY" as const,
    passage:
      "Public libraries in many countries have expanded well beyond their traditional role as book-lending institutions. Alongside print and digital collections, contemporary libraries frequently offer free public computer access, job-search assistance, language-learning programs, and meeting spaces for community groups. This shift has been driven partly by declining print circulation in some regions and partly by a recognition that libraries occupy a unique position as free, publicly accessible spaces open to people of all ages and backgrounds. Library administrators often describe this broadened mission using the term \"community anchor institution,\" reflecting the idea that a library's value now extends well beyond the materials on its shelves to the services and social connections it enables within its neighborhood.",
    prompt: "What does the term \"community anchor institution\" reflect, according to the passage?",
    options: [
      { key: "A", text: "The idea that a library's value now extends beyond its shelved materials to the services and connections it provides." },
      { key: "B", text: "A legal requirement that libraries remain open to the public at all times." },
      { key: "C", text: "The declining popularity of print books among library patrons." },
      { key: "D", text: "A funding model in which libraries are financed entirely by community donations." },
    ],
    correctOption: "A",
    explanation:
      "The passage directly defines the term: it reflects 'the idea that a library's value now extends well beyond the materials on its shelves to the services and social connections it enables' — matching option A.",
    estimatedTimeSec: 85,
    tags: ["society", "education"],
  },
];

async function main() {
  for (const item of READING_ITEMS) {
    const existing = await prisma.toeflContent.findFirst({
      where: { skill: "READING", taskType: "READING_MCQ", prompt: item.prompt },
    });
    if (existing) {
      console.log(`Already seeded: ${item.slug}`);
      continue;
    }
    await prisma.toeflContent.create({
      data: {
        skill: "READING",
        taskType: "READING_MCQ",
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
    console.log(`Created: ${item.slug}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
