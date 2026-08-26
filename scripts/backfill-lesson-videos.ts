// One-off, safe-to-rerun backfill for the 3 video demo lessons. Updates
// existing lesson rows IN PLACE (by moduleId + title, never delete+recreate)
// so it never disturbs LessonProgress/AiConversation rows or any other
// seeded data. Idempotent: clears and recreates only this lesson's own
// chapters/checkpoints before reinserting them.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const VIDEO_URL = "https://vjs.zencdn.net/v/oceans.mp4";
const VIDEO_ATTRIBUTION = "Demo video — Video.js sample library (vjs.zencdn.net)";
const DURATION_SECONDS = 46;
const OPTION_KEYS = ["A", "B", "C", "D"] as const;

type Checkpoint = {
  atSeconds: number;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation?: string;
};

type Chapter = {
  title: string;
  startSeconds: number;
  endSeconds?: number;
  transcriptSegment?: string;
  checkpoint?: Checkpoint;
};

type Target = {
  courseId: string;
  lessonTitle: string;
  notesMarkdown: string;
  chapters: Chapter[];
};

const targets: Target[] = [
  {
    courseId: "seed-course-financial-literacy",
    lessonTitle: "Introduction to Banks and Interest",
    notesMarkdown:
      "**Key takeaway:** a bank is a middleman — it pays you interest to hold your money, then lends that money to others at a higher interest rate, keeping the difference.",
    chapters: [
      {
        title: "How Banks Store Your Money",
        startSeconds: 0,
        endSeconds: 15,
        transcriptSegment:
          "Banks exist to hold your money more safely than keeping cash at home, while still letting you access it whenever you need to.",
        checkpoint: {
          atSeconds: 14,
          prompt: "What is the main benefit of keeping your money in a bank rather than at home?",
          options: ["It earns interest", "It disappears faster", "Banks charge you to hold it", "It's illegal to keep cash at home"],
          correctIndex: 0,
          explanation: "Banks pay you interest for keeping your money with them, which cash at home never does.",
        },
      },
      {
        title: "Earning Interest on Savings",
        startSeconds: 15,
        endSeconds: 30,
        transcriptSegment:
          "Interest is the bank's way of paying you for the use of your money. The rate is usually quoted per year, and it grows the longer you leave your savings untouched.",
        checkpoint: {
          atSeconds: 29,
          prompt: "If a bank pays 5% simple annual interest, how much would ₦10,000 earn in one year?",
          options: ["₦50", "₦500", "₦5,000", "₦100"],
          correctIndex: 1,
          explanation: "5% of ₦10,000 is ₦500 (10,000 × 0.05).",
        },
      },
      {
        title: "How Loans Work",
        startSeconds: 30,
        transcriptSegment:
          "The bank lends a portion of the money it holds to other customers, charging them a higher interest rate than it pays savers — the difference is how the bank makes money.",
      },
    ],
  },
  {
    courseId: "seed-course-mathematics-foundations",
    lessonTitle: "Rules of Indices",
    notesMarkdown:
      "**Key takeaway:** the index rules only combine powers that share the same base — always check the base matches before applying a rule.",
    chapters: [
      {
        title: "Multiplying and Dividing Powers",
        startSeconds: 0,
        endSeconds: 15,
        transcriptSegment:
          "When multiplying powers with the same base, add the exponents: a^m × a^n = a^(m+n). When dividing, subtract them: a^m ÷ a^n = a^(m-n).",
        checkpoint: {
          atSeconds: 14,
          prompt: "Simplify: a^3 × a^4",
          options: ["a^7", "a^12", "a^1", "a^-1"],
          correctIndex: 0,
          explanation: "Add the exponents when multiplying powers of the same base: 3 + 4 = 7, so a^3 × a^4 = a^7.",
        },
      },
      {
        title: "Power of a Power and Zero Power",
        startSeconds: 15,
        endSeconds: 30,
        transcriptSegment:
          "Raising a power to another power multiplies the exponents: (a^m)^n = a^(mn). Any nonzero base raised to the power of zero equals 1.",
        checkpoint: {
          atSeconds: 29,
          prompt: "What is x^0 for x ≠ 0?",
          options: ["0", "1", "x", "Undefined"],
          correctIndex: 1,
          explanation: "Any nonzero base raised to the power of 0 equals 1, by definition.",
        },
      },
      {
        title: "Practice Walkthrough",
        startSeconds: 30,
        transcriptSegment:
          "Working through a mixed example that combines multiplying, dividing, and the power-of-a-power rule in one expression.",
      },
    ],
  },
  {
    courseId: "seed-course-intro-coding",
    lessonTitle: "Loops",
    notesMarkdown:
      "**Key takeaway:** use a `for` loop when you know how many times to repeat; use a `while` loop when you're repeating until a condition changes.",
    chapters: [
      {
        title: "For Loops",
        startSeconds: 0,
        endSeconds: 15,
        transcriptSegment:
          "A for loop repeats a block of code a fixed number of times, or once for every item in a collection like a list.",
        checkpoint: {
          atSeconds: 14,
          prompt: "What does `for i in range(3): print(i)` output?",
          options: ["0 1 2", "1 2 3", "0 1 2 3", "3"],
          correctIndex: 0,
          explanation: "range(3) produces 0, 1, 2 — range() counts up to but not including its argument.",
        },
      },
      {
        title: "While Loops",
        startSeconds: 15,
        endSeconds: 30,
        transcriptSegment:
          "A while loop keeps running as long as its condition stays true, checking the condition again before every repeat.",
        checkpoint: {
          atSeconds: 29,
          prompt: "What danger do while loops have that for loops usually avoid?",
          options: [
            "Infinite loops if the condition never becomes false",
            "They can't use variables",
            "They run backwards",
            "They require a newer Python version",
          ],
          correctIndex: 0,
          explanation: "If nothing inside a while loop ever makes its condition false, it will run forever.",
        },
      },
      {
        title: "Common Pitfalls",
        startSeconds: 30,
        transcriptSegment:
          "Forgetting to update the loop variable, off-by-one errors in range(), and accidentally reusing a loop variable outside the loop are the most common mistakes beginners make.",
      },
    ],
  },
];

async function main() {
  for (const target of targets) {
    const lesson = await prisma.lesson.findFirst({
      where: { title: target.lessonTitle, module: { courseId: target.courseId } },
    });
    if (!lesson) {
      console.warn(`SKIP: lesson "${target.lessonTitle}" not found in course ${target.courseId}`);
      continue;
    }

    await prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        type: "VIDEO",
        videoUrl: VIDEO_URL,
        videoAttribution: VIDEO_ATTRIBUTION,
        durationSeconds: DURATION_SECONDS,
        notesMarkdown: target.notesMarkdown,
      },
    });

    // Idempotent: this lesson's own chapters/checkpoints only. Checkpoint
    // quizQuestions must go first — LessonChapter's FK from QuizQuestion
    // would otherwise block the chapter delete.
    await prisma.quizQuestion.deleteMany({ where: { lessonId: lesson.id, atSeconds: { not: null } } });
    await prisma.lessonChapter.deleteMany({ where: { lessonId: lesson.id } });

    for (const [i, chapter] of target.chapters.entries()) {
      const createdChapter = await prisma.lessonChapter.create({
        data: {
          lessonId: lesson.id,
          order: i,
          title: chapter.title,
          startSeconds: chapter.startSeconds,
          endSeconds: chapter.endSeconds,
          transcriptSegment: chapter.transcriptSegment,
        },
      });

      if (chapter.checkpoint) {
        const cp = chapter.checkpoint;
        await prisma.quizQuestion.create({
          data: {
            lessonId: lesson.id,
            chapterId: createdChapter.id,
            order: i,
            atSeconds: cp.atSeconds,
            prompt: cp.prompt,
            options: cp.options.map((text, idx) => ({ key: OPTION_KEYS[idx], text })),
            correctOption: OPTION_KEYS[cp.correctIndex],
            explanation: cp.explanation,
          },
        });
      }
    }

    console.log(`OK: updated "${target.lessonTitle}" (lesson ${lesson.id}) with ${target.chapters.length} chapters.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
