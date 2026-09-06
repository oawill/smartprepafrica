import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Same idempotent seed pattern as Reading/Listening/Writing. Three
// original TOEFL-style independent speaking prompts — no passage/audio
// on the prompt side (that's the integrated task, a later extension).
const SPEAKING_ITEMS = [
  {
    slug: "toefl-speaking-001",
    difficulty: "EASY" as const,
    prompt:
      "Describe a teacher who has had a positive influence on your life. Explain what made this teacher memorable and how they influenced you.",
    tags: ["education", "personal experience"],
  },
  {
    slug: "toefl-speaking-002",
    difficulty: "MEDIUM" as const,
    prompt:
      "Some people prefer to study alone, while others prefer to study in groups. Which do you prefer, and why? Include specific reasons and details in your response.",
    tags: ["education", "opinion"],
  },
  {
    slug: "toefl-speaking-003",
    difficulty: "MEDIUM" as const,
    prompt:
      "Describe a piece of technology that has changed the way you complete everyday tasks. Explain how it has changed your routine.",
    tags: ["technology", "personal experience"],
  },
];

async function main() {
  for (const item of SPEAKING_ITEMS) {
    const existing = await prisma.toeflContent.findFirst({
      where: { skill: "SPEAKING", taskType: "SPEAKING_INDEPENDENT", prompt: item.prompt },
    });
    if (existing) {
      console.log(`Already seeded: ${item.slug}`);
      continue;
    }
    await prisma.toeflContent.create({
      data: {
        skill: "SPEAKING",
        taskType: "SPEAKING_INDEPENDENT",
        difficulty: item.difficulty,
        status: "PUBLISHED",
        prompt: item.prompt,
        estimatedTimeSec: 60,
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
