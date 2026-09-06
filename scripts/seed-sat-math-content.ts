import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Mirrors scripts/seed-sat-reading-writing-content.ts's approach — original
// SAT-style Math items, mixing MULTIPLE_CHOICE and STUDENT_PRODUCED_RESPONSE
// (numeric/grid-in) question types, across the four real Math domains.
// Prompts use LaTeX (rendered via the existing MessageContent/KaTeX
// component) where real SAT questions would show mathematical notation.
const MATH_ITEMS = [
  {
    domain: "Algebra",
    questionType: "MULTIPLE_CHOICE" as const,
    difficulty: "EASY" as const,
    prompt: "If $3x + 7 = 22$, what is the value of $x$?",
    options: [
      { key: "A", text: "3" },
      { key: "B", text: "5" },
      { key: "C", text: "7" },
      { key: "D", text: "15" },
    ],
    correctOption: "B",
    correctValue: null,
    explanation: "$3x + 7 = 22 \\Rightarrow 3x = 15 \\Rightarrow x = 5$.",
    estimatedTimeSec: 60,
    tags: ["algebra", "linear-equations"],
  },
  {
    domain: "Algebra",
    questionType: "STUDENT_PRODUCED_RESPONSE" as const,
    difficulty: "MEDIUM" as const,
    prompt: "A line passes through the points $(2, 5)$ and $(4, 11)$. What is the slope of the line?",
    options: null,
    correctOption: null,
    correctValue: "3",
    explanation: "Slope $= \\dfrac{11 - 5}{4 - 2} = \\dfrac{6}{2} = 3$.",
    estimatedTimeSec: 75,
    tags: ["algebra", "slope"],
  },
  {
    domain: "Advanced Math",
    questionType: "MULTIPLE_CHOICE" as const,
    difficulty: "MEDIUM" as const,
    prompt: "Which of the following is equivalent to $(x + 3)(x - 3)$?",
    options: [
      { key: "A", text: "$x^2 - 9$" },
      { key: "B", text: "$x^2 + 9$" },
      { key: "C", text: "$x^2 - 6x - 9$" },
      { key: "D", text: "$x^2 + 6x + 9$" },
    ],
    correctOption: "A",
    correctValue: null,
    explanation: "This is a difference of squares: $(x+3)(x-3) = x^2 - 9$.",
    estimatedTimeSec: 60,
    tags: ["advanced-math", "factoring"],
  },
  {
    domain: "Problem-Solving and Data Analysis",
    questionType: "STUDENT_PRODUCED_RESPONSE" as const,
    difficulty: "EASY" as const,
    prompt:
      "A survey of 40 students found that 25 of them own a bicycle. What percent of the surveyed students own a bicycle? (Enter your answer as a whole number, without the percent sign.)",
    options: null,
    correctOption: null,
    correctValue: "62.5",
    explanation: "$\\dfrac{25}{40} \\times 100 = 62.5$ percent.",
    estimatedTimeSec: 70,
    tags: ["problem-solving-and-data-analysis", "percentages"],
  },
  {
    domain: "Geometry and Trigonometry",
    questionType: "MULTIPLE_CHOICE" as const,
    difficulty: "MEDIUM" as const,
    prompt: "A right triangle has legs of length $6$ and $8$. What is the length of its hypotenuse?",
    options: [
      { key: "A", text: "10" },
      { key: "B", text: "12" },
      { key: "C", text: "14" },
      { key: "D", text: "$\\sqrt{28}$" },
    ],
    correctOption: "A",
    correctValue: null,
    explanation: "By the Pythagorean theorem, $\\sqrt{6^2 + 8^2} = \\sqrt{36 + 64} = \\sqrt{100} = 10$.",
    estimatedTimeSec: 65,
    tags: ["geometry-and-trigonometry", "pythagorean-theorem"],
  },
  {
    domain: "Geometry and Trigonometry",
    questionType: "STUDENT_PRODUCED_RESPONSE" as const,
    difficulty: "HARD" as const,
    prompt:
      "A circle has a circumference of $18\\pi$. What is the radius of the circle?",
    options: null,
    correctOption: null,
    correctValue: "9",
    explanation: "$C = 2\\pi r \\Rightarrow 18\\pi = 2\\pi r \\Rightarrow r = 9$.",
    estimatedTimeSec: 80,
    tags: ["geometry-and-trigonometry", "circles"],
  },
];

async function main() {
  for (const item of MATH_ITEMS) {
    const existing = await prisma.satContent.findFirst({
      where: { section: "MATH", prompt: item.prompt },
    });
    if (existing) {
      console.log(`Already seeded: ${item.domain} — ${item.prompt.slice(0, 40)}...`);
      continue;
    }
    await prisma.satContent.create({
      data: {
        section: "MATH",
        domain: item.domain,
        questionType: item.questionType,
        difficulty: item.difficulty,
        status: "PUBLISHED",
        prompt: item.prompt,
        options: item.options ?? undefined,
        correctOption: item.correctOption,
        correctValue: item.correctValue,
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
