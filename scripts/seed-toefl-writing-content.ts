import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Same idempotent seed pattern as Reading/Listening. Three original
// TOEFL-style independent writing prompts — no passage/audio, since this
// step covers the independent task only (the integrated task, which
// combines a reading passage + lecture audio with the writing prompt,
// is a later extension, not required for this slice).
const WRITING_ITEMS = [
  {
    slug: "toefl-writing-001",
    difficulty: "MEDIUM" as const,
    prompt:
      "Do you agree or disagree with the following statement? \"Young people today rely too much on technology and not enough on their own critical thinking skills.\" Use specific reasons and examples to support your answer.",
    tags: ["technology", "opinion"],
  },
  {
    slug: "toefl-writing-002",
    difficulty: "MEDIUM" as const,
    prompt:
      "Some people believe that university students should be required to take courses outside their major field of study, while others believe students should focus exclusively on their chosen field. Which view do you agree with? Use specific reasons and examples to support your position.",
    tags: ["education", "opinion"],
  },
  {
    slug: "toefl-writing-003",
    difficulty: "HARD" as const,
    prompt:
      "Some people prefer to live in a small town, while others prefer to live in a big city. Which do you think is better, and why? Use specific reasons and details to support your answer.",
    tags: ["lifestyle", "opinion"],
  },
];

async function main() {
  for (const item of WRITING_ITEMS) {
    const existing = await prisma.toeflContent.findFirst({
      where: { skill: "WRITING", taskType: "WRITING_INDEPENDENT", prompt: item.prompt },
    });
    if (existing) {
      console.log(`Already seeded: ${item.slug}`);
      continue;
    }
    await prisma.toeflContent.create({
      data: {
        skill: "WRITING",
        taskType: "WRITING_INDEPENDENT",
        difficulty: item.difficulty,
        status: "PUBLISHED",
        prompt: item.prompt,
        estimatedTimeSec: 1800,
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
