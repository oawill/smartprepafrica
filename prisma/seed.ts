import {
  PrismaClient,
  CourseCategory,
  ExamType,
  Difficulty,
  LessonType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type SeedQuestion = {
  exam: ExamType;
  subject: string;
  topic: string;
  difficulty?: Difficulty;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
};

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

const mathQuestions: SeedQuestion[] = [
  {
    exam: ExamType.UTME,
    subject: "Mathematics",
    topic: "Algebra",
    prompt: "Simplify: 2x + 3x",
    options: ["5x", "6x", "x", "5x^2"],
    correctIndex: 0,
    explanation: "2x + 3x combines like terms to give 5x.",
  },
  {
    exam: ExamType.UTME,
    subject: "Mathematics",
    topic: "Algebra",
    prompt: "Solve for x: 3x = 12",
    options: ["3", "4", "9", "36"],
    correctIndex: 1,
    explanation: "Divide both sides by 3: x = 12 / 3 = 4.",
  },
  {
    exam: ExamType.UTME,
    subject: "Mathematics",
    topic: "Percentages",
    prompt: "What is 15% of 200?",
    options: ["15", "20", "30", "45"],
    correctIndex: 2,
    explanation: "15% of 200 = 0.15 x 200 = 30.",
  },
  {
    exam: ExamType.UTME,
    subject: "Mathematics",
    topic: "Indices",
    prompt: "Evaluate: 3^2 + 4^2",
    options: ["14", "24", "25", "49"],
    correctIndex: 2,
    explanation: "3^2 = 9 and 4^2 = 16, so 9 + 16 = 25.",
  },
  {
    exam: ExamType.UTME,
    subject: "Mathematics",
    topic: "Algebra",
    prompt: "Solve for x: 2x - 5 = 9",
    options: ["2", "5", "7", "14"],
    correctIndex: 2,
    explanation: "2x = 9 + 5 = 14, so x = 7.",
  },
  {
    exam: ExamType.UTME,
    subject: "Mathematics",
    topic: "Indices",
    prompt: "Simplify: x^2 * x^3",
    options: ["x^5", "x^6", "x^1", "2x^5"],
    correctIndex: 0,
    explanation: "When multiplying powers of the same base, add the exponents: x^(2+3) = x^5.",
  },
  {
    exam: ExamType.UTME,
    subject: "Mathematics",
    topic: "Sequences",
    prompt: "What is the next number in the sequence 2, 4, 8, 16, __?",
    options: ["18", "24", "30", "32"],
    correctIndex: 3,
    explanation: "Each term doubles the previous one, so 16 x 2 = 32.",
    difficulty: Difficulty.EASY,
  },
  {
    exam: ExamType.UTME,
    subject: "Mathematics",
    topic: "Algebra",
    prompt: "If y = 2x + 1 and x = 3, find y.",
    options: ["5", "6", "7", "8"],
    correctIndex: 2,
    explanation: "y = 2(3) + 1 = 6 + 1 = 7.",
  },
  {
    exam: ExamType.UTME,
    subject: "Mathematics",
    topic: "Geometry",
    prompt: "What is the sum of the interior angles of a triangle?",
    options: ["90°", "180°", "270°", "360°"],
    correctIndex: 1,
    explanation: "The interior angles of any triangle always sum to 180°.",
    difficulty: Difficulty.EASY,
  },
  {
    exam: ExamType.UTME,
    subject: "Mathematics",
    topic: "Algebra",
    prompt: "Solve for x: x / 3 = 6",
    options: ["2", "3", "9", "18"],
    correctIndex: 3,
    explanation: "Multiply both sides by 3: x = 6 x 3 = 18.",
  },
  {
    exam: ExamType.UTME,
    subject: "Mathematics",
    topic: "Number bases",
    prompt: "What is the LCM of 4 and 6?",
    options: ["10", "12", "24", "2"],
    correctIndex: 1,
    explanation: "Multiples of 4: 4, 8, 12... Multiples of 6: 6, 12... The lowest common one is 12.",
  },
  {
    exam: ExamType.UTME,
    subject: "Mathematics",
    topic: "Algebra",
    prompt: "Simplify: 5(x + 2)",
    options: ["5x + 2", "5x + 10", "x + 10", "5x + 7"],
    correctIndex: 1,
    explanation: "Distribute the 5: 5(x + 2) = 5x + 10.",
  },
  {
    exam: ExamType.UTME,
    subject: "Mathematics",
    topic: "Indices",
    prompt: "What is the square root of 144?",
    options: ["11", "12", "14", "16"],
    correctIndex: 1,
    explanation: "12 x 12 = 144, so √144 = 12.",
    difficulty: Difficulty.EASY,
  },
  {
    exam: ExamType.UTME,
    subject: "Mathematics",
    topic: "Fractions",
    prompt: "Convert 0.75 to a fraction in its lowest terms.",
    options: ["3/4", "7/5", "3/5", "1/4"],
    correctIndex: 0,
    explanation: "0.75 = 75/100, which simplifies to 3/4.",
  },
  {
    exam: ExamType.UTME,
    subject: "Mathematics",
    topic: "Algebra",
    prompt: "If a = 5 and b = 3, find a^2 - b^2.",
    options: ["4", "8", "16", "25"],
    correctIndex: 2,
    explanation: "a^2 - b^2 = 25 - 9 = 16.",
  },
];

const englishQuestions: SeedQuestion[] = [
  {
    exam: ExamType.UTME,
    subject: "English Language",
    topic: "Spelling",
    prompt: "Choose the correctly spelled word.",
    options: ["Recieve", "Receive", "Receve", "Receeve"],
    correctIndex: 1,
    explanation: "'Receive' follows the rule 'i before e except after c'.",
    difficulty: Difficulty.EASY,
  },
  {
    exam: ExamType.UTME,
    subject: "English Language",
    topic: "Vocabulary",
    prompt: "Choose the word closest in meaning to 'happy'.",
    options: ["Sad", "Joyful", "Angry", "Tired"],
    correctIndex: 1,
    explanation: "'Joyful' is a synonym of 'happy'.",
    difficulty: Difficulty.EASY,
  },
  {
    exam: ExamType.UTME,
    subject: "English Language",
    topic: "Vocabulary",
    prompt: "Choose the word opposite in meaning to 'increase'.",
    options: ["Decrease", "Expand", "Grow", "Rise"],
    correctIndex: 0,
    explanation: "'Decrease' is the antonym (opposite) of 'increase'.",
    difficulty: Difficulty.EASY,
  },
  {
    exam: ExamType.UTME,
    subject: "English Language",
    topic: "Grammar",
    prompt: "Choose the grammatically correct sentence.",
    options: [
      "He go to school",
      "He goes to school",
      "He going to school",
      "He gone to school",
    ],
    correctIndex: 1,
    explanation: "'Goes' is the correct present-tense form for the third-person singular subject 'he'.",
  },
  {
    exam: ExamType.UTME,
    subject: "English Language",
    topic: "Grammar",
    prompt: "Fill the gap: She ___ to the market yesterday.",
    options: ["go", "goes", "went", "going"],
    correctIndex: 2,
    explanation: "'Yesterday' signals the simple past tense, so 'went' is correct.",
  },
  {
    exam: ExamType.UTME,
    subject: "English Language",
    topic: "Grammar",
    prompt: "Identify the noun in: 'The dog barked loudly.'",
    options: ["dog", "barked", "loudly", "the"],
    correctIndex: 0,
    explanation: "'Dog' is the noun — the person, place, or thing in the sentence.",
    difficulty: Difficulty.EASY,
  },
  {
    exam: ExamType.UTME,
    subject: "English Language",
    topic: "Grammar",
    prompt: "What is the plural form of 'child'?",
    options: ["Childs", "Childes", "Children", "Childrens"],
    correctIndex: 2,
    explanation: "'Child' has an irregular plural form: 'children'.",
    difficulty: Difficulty.EASY,
  },
  {
    exam: ExamType.UTME,
    subject: "English Language",
    topic: "Grammar",
    prompt: "Choose the correct preposition: She is good ___ mathematics.",
    options: ["at", "in", "on", "for"],
    correctIndex: 0,
    explanation: "The correct idiomatic preposition is 'good at [a subject/skill]'.",
  },
];

const physicsQuestions: SeedQuestion[] = [
  {
    exam: ExamType.WAEC,
    subject: "Physics",
    topic: "Mechanics",
    prompt: "What is the SI unit of force?",
    options: ["Joule", "Newton", "Watt", "Pascal"],
    correctIndex: 1,
    explanation: "Force is measured in Newtons (N) in the SI system.",
    difficulty: Difficulty.EASY,
  },
  {
    exam: ExamType.WAEC,
    subject: "Physics",
    topic: "Mechanics",
    prompt: "Speed is calculated as:",
    options: [
      "distance x time",
      "distance / time",
      "time / distance",
      "mass x acceleration",
    ],
    correctIndex: 1,
    explanation: "Speed = distance travelled divided by time taken.",
  },
  {
    exam: ExamType.WAEC,
    subject: "Physics",
    topic: "Mechanics",
    prompt: "The acceleration due to gravity near Earth's surface is approximately:",
    options: ["4.9 m/s^2", "9.8 m/s^2", "12.6 m/s^2", "24.5 m/s^2"],
    correctIndex: 1,
    explanation: "Standard gravity is approximately 9.8 m/s^2.",
  },
  {
    exam: ExamType.WAEC,
    subject: "Physics",
    topic: "Electricity",
    prompt: "Ohm's law is expressed as:",
    options: ["V = IR", "V = I/R", "V = I + R", "V = I^2R"],
    correctIndex: 0,
    explanation: "Ohm's law states that voltage equals current multiplied by resistance: V = IR.",
  },
  {
    exam: ExamType.WAEC,
    subject: "Physics",
    topic: "Electricity",
    prompt: "The SI unit of electric current is the:",
    options: ["Volt", "Watt", "Ampere", "Ohm"],
    correctIndex: 2,
    explanation: "Electric current is measured in Amperes (A).",
    difficulty: Difficulty.EASY,
  },
];

const chemistryQuestions: SeedQuestion[] = [
  {
    exam: ExamType.WAEC,
    subject: "Chemistry",
    topic: "Chemical formulae",
    prompt: "What is the chemical formula for water?",
    options: ["H2O", "HO2", "H2O2", "OH"],
    correctIndex: 0,
    explanation: "Water is composed of two hydrogen atoms and one oxygen atom: H2O.",
    difficulty: Difficulty.EASY,
  },
  {
    exam: ExamType.WAEC,
    subject: "Chemistry",
    topic: "Atomic structure",
    prompt: "What is the atomic number of Hydrogen?",
    options: ["0", "1", "2", "8"],
    correctIndex: 1,
    explanation: "Hydrogen has one proton, giving it an atomic number of 1.",
    difficulty: Difficulty.EASY,
  },
  {
    exam: ExamType.WAEC,
    subject: "Chemistry",
    topic: "Acids and bases",
    prompt: "A neutral solution has a pH of:",
    options: ["0", "7", "14", "10"],
    correctIndex: 1,
    explanation: "A pH of 7 is neutral; below 7 is acidic and above 7 is basic.",
  },
  {
    exam: ExamType.WAEC,
    subject: "Chemistry",
    topic: "Chemical formulae",
    prompt: "What is the chemical symbol for Sodium?",
    options: ["S", "So", "Na", "N"],
    correctIndex: 2,
    explanation: "Sodium's symbol, Na, comes from its Latin name 'natrium'.",
  },
  {
    exam: ExamType.WAEC,
    subject: "Chemistry",
    topic: "Gases",
    prompt: "Which gas turns limewater milky?",
    options: ["Oxygen", "Hydrogen", "Carbon dioxide", "Nitrogen"],
    correctIndex: 2,
    explanation: "Carbon dioxide reacts with limewater (calcium hydroxide) to form a milky precipitate.",
  },
];

const biologyQuestions: SeedQuestion[] = [
  {
    exam: ExamType.WAEC,
    subject: "Biology",
    topic: "Cell biology",
    prompt: "What is the basic unit of life?",
    options: ["Tissue", "Cell", "Organ", "Organism"],
    correctIndex: 1,
    explanation: "The cell is the smallest structural and functional unit of living organisms.",
    difficulty: Difficulty.EASY,
  },
  {
    exam: ExamType.WAEC,
    subject: "Biology",
    topic: "Cell biology",
    prompt: "Which organelle is known as the powerhouse of the cell?",
    options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi body"],
    correctIndex: 2,
    explanation: "Mitochondria generate most of the cell's ATP (energy) through respiration.",
  },
  {
    exam: ExamType.WAEC,
    subject: "Biology",
    topic: "Plant biology",
    prompt: "The process by which green plants make their own food is called:",
    options: ["Respiration", "Photosynthesis", "Transpiration", "Germination"],
    correctIndex: 1,
    explanation: "Photosynthesis converts light energy, water, and carbon dioxide into glucose and oxygen.",
    difficulty: Difficulty.EASY,
  },
  {
    exam: ExamType.WAEC,
    subject: "Biology",
    topic: "Plant biology",
    prompt: "What is the green pigment found in plants called?",
    options: ["Melanin", "Chlorophyll", "Hemoglobin", "Carotene"],
    correctIndex: 1,
    explanation: "Chlorophyll absorbs light energy for photosynthesis and gives plants their green color.",
  },
  {
    exam: ExamType.WAEC,
    subject: "Biology",
    topic: "Human biology",
    prompt: "How many chambers does the human heart have?",
    options: ["2", "3", "4", "5"],
    correctIndex: 2,
    explanation: "The human heart has four chambers: two atria and two ventricles.",
    difficulty: Difficulty.EASY,
  },
];

const allQuestions = [
  ...mathQuestions,
  ...englishQuestions,
  ...physicsQuestions,
  ...chemistryQuestions,
  ...biologyQuestions,
];

type SeedLesson = {
  title: string;
  type: LessonType;
  content?: string;
  videoUrl?: string;
  // Matches a Question.topic for this course's subject, linking the lesson
  // to SmartPrepAfrica practice questions on the same concept.
  topic?: string;
};

type SeedModule = {
  title: string;
  lessons: SeedLesson[];
};

type SeedCourse = {
  id: string;
  title: string;
  description: string;
  category: CourseCategory;
  instructorName?: string;
  difficulty?: Difficulty;
  estimatedMinutes?: number;
  learningObjectives?: string[];
  priceKobo?: number;
  subjectName?: string;
  examType?: ExamType;
  modules: SeedModule[];
};

const courseSeeds: SeedCourse[] = [
  {
    id: "seed-course-financial-literacy",
    title: "Financial Literacy Basics",
    description: "Budgeting, saving, and understanding money as a student.",
    category: CourseCategory.FINANCIAL_LITERACY,
    instructorName: "Ngozi Adeyemi",
    difficulty: Difficulty.EASY,
    estimatedMinutes: 45,
    learningObjectives: [
      "Explain why money exists and how it functions as a medium of exchange",
      "Distinguish needs from wants when making spending decisions",
      "Build a simple personal budget",
      "Explain how compound interest makes saving early valuable",
    ],
    modules: [
      {
        title: "Understanding Money",
        lessons: [
          {
            title: "What Is Money?",
            type: LessonType.TEXT,
            content:
              "Money is anything widely accepted as payment for goods and services. Before money existed, people traded through barter — swapping a good or service directly for another. Barter worked poorly because it required a 'double coincidence of wants': both people had to want exactly what the other had.\n\nMoney solves this by acting as a medium of exchange, a store of value, and a unit of account. In Nigeria, the Naira serves this role — you can earn it doing one thing and spend it on something completely different, without needing to trade goods directly.",
          },
          {
            title: "Needs vs Wants",
            type: LessonType.TEXT,
            content:
              "A need is something essential for survival or basic functioning — food, shelter, school fees, transport to school. A want is something that improves your life but isn't essential — the latest phone, snacks, or a new pair of trainers.\n\nMost money problems come from treating wants like needs. Before spending, ask: 'If I didn't buy this, would something important break?' If the answer is no, it's a want. That doesn't mean wants are bad — it means they should come after needs and savings are covered.",
          },
        ],
      },
      {
        title: "Budgeting Basics",
        lessons: [
          {
            title: "Creating Your First Budget",
            type: LessonType.TEXT,
            content:
              "A budget is simply a plan for your money before you spend it. Start with three numbers: how much money you receive (allowance, gifts, or a side hustle), how much you must spend on needs, and how much is left over.\n\nA simple format: List your income for the month. List your fixed expenses (things that don't change, like transport). List your variable expenses (things that change, like snacks). Subtract expenses from income — what's left is what you can save or spend on wants.",
          },
          {
            title: "The 50/30/20 Rule",
            type: LessonType.TEXT,
            content:
              "A popular budgeting guideline splits money into three buckets: 50% on needs, 30% on wants, and 20% on savings.\n\nAs a student, your ratios might look different — you may not have income yet, or your parents cover your needs. Adapt the rule: even saving 10-20% of whatever money passes through your hands (allowance, gifts, part-time earnings) builds the habit early, and the habit matters more than the exact numbers.",
          },
        ],
      },
      {
        title: "Saving & Growing Money",
        lessons: [
          {
            title: "Why Save Early",
            type: LessonType.TEXT,
            content:
              "Saving early matters because of compound interest — interest earned not just on what you saved, but on the interest you already earned. Someone who saves a small amount starting at 16 can end up with more than someone who saves a much larger amount starting at 30, simply because their money has more time to grow.\n\nBeyond interest, an early savings habit also builds discipline that carries into every other financial decision you'll make as an adult.",
          },
          {
            title: "Introduction to Banks and Interest",
            type: LessonType.VIDEO,
            videoUrl:
              "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            content:
              "This video introduces how banks work: they hold your money safely, pay you interest for keeping it with them, and lend a portion of it to others (who pay the bank interest in return). Understanding this cycle helps explain why savings accounts, fixed deposits, and loans all behave the way they do.",
          },
        ],
      },
    ],
  },
  {
    id: "seed-course-intro-coding",
    title: "Introduction to Coding with Python",
    description:
      "Your first steps into programming — variables, logic, and writing your first programs in Python.",
    category: CourseCategory.CODING,
    instructorName: "Chidi Okafor",
    difficulty: Difficulty.EASY,
    estimatedMinutes: 60,
    learningObjectives: [
      "Explain what a program is and why Python is a good first language",
      "Declare and use variables of different data types",
      "Write conditional logic with if/elif/else",
      "Write for and while loops",
    ],
    modules: [
      {
        title: "Getting Started",
        lessons: [
          {
            title: "What Is Programming?",
            type: LessonType.TEXT,
            content:
              "Programming is giving a computer precise, step-by-step instructions to solve a problem or perform a task. A program is just a sequence of these instructions, written in a language the computer can understand.\n\nPython is one of the most beginner-friendly programming languages because its syntax reads almost like plain English. It's used in web development, data science, artificial intelligence, and automation — making it a great first language.",
          },
          {
            title: "Variables and Data Types",
            type: LessonType.TEXT,
            content:
              "A variable is a named container for a value. In Python, you create one simply by assigning it: `name = \"Ada\"` or `age = 16`.\n\nPython has several core data types: strings (text, like \"Ada\"), integers (whole numbers, like 16), floats (decimal numbers, like 3.14), and booleans (True or False). Understanding which type you're working with matters — you can add two numbers, but adding a number to text will cause an error unless you convert it first.",
          },
        ],
      },
      {
        title: "Logic and Control Flow",
        lessons: [
          {
            title: "If Statements",
            type: LessonType.TEXT,
            content:
              "Programs often need to make decisions. An `if` statement runs a block of code only when a condition is true:\n\n```python\nscore = 75\nif score >= 50:\n    print(\"Pass\")\nelse:\n    print(\"Fail\")\n```\n\nThis prints \"Pass\" because 75 is greater than or equal to 50. You can chain more conditions using `elif` (short for 'else if') to check multiple possibilities in order.",
          },
          {
            title: "Loops",
            type: LessonType.TEXT,
            content:
              "Loops let you repeat an action without writing it out multiple times. A `for` loop repeats a fixed number of times or over a collection of items:\n\n```python\nfor i in range(5):\n    print(i)\n```\n\nThis prints 0 through 4. A `while` loop repeats as long as a condition stays true — useful when you don't know in advance how many times you'll need to repeat something.",
          },
        ],
      },
    ],
  },
  {
    id: "seed-course-mathematics-foundations",
    title: "Mathematics Foundations",
    description:
      "Core secondary-school mathematics — algebra, geometry, and number concepts that underpin WAEC, NECO, and UTME.",
    category: CourseCategory.ACADEMIC,
    instructorName: "Funmilayo Bakare",
    difficulty: Difficulty.MEDIUM,
    estimatedMinutes: 90,
    learningObjectives: [
      "Solve linear equations confidently",
      "Apply the rules of indices",
      "Recognize and extend number sequences",
    ],
    subjectName: "Mathematics",
    modules: [
      {
        title: "Algebra Essentials",
        lessons: [
          {
            title: "Solving Linear Equations",
            type: LessonType.TEXT,
            content:
              "A linear equation is one where the unknown appears only to the first power — no squares, no roots. The goal is always to isolate the variable on one side.\n\nTake 3x + 4 = 19. Subtract 4 from both sides: 3x = 15. Divide both sides by 3: x = 5. Every linear equation follows this same pattern of undoing operations in reverse order — addition/subtraction first, then multiplication/division.",
            topic: "Algebra",
          },
          {
            title: "Rules of Indices",
            type: LessonType.TEXT,
            content:
              "Indices (powers) follow a small set of rules that make simplifying expressions much faster once memorized:\n\n- Multiplying: a^m × a^n = a^(m+n)\n- Dividing: a^m ÷ a^n = a^(m-n)\n- Power of a power: (a^m)^n = a^(mn)\n- Zero power: a^0 = 1 (for a ≠ 0)\n\nThese rules only apply directly when the base (the 'a') is the same on both sides — you can't combine 2^3 and 3^2 this way.",
            topic: "Indices",
          },
        ],
      },
    ],
  },
  {
    id: "seed-course-waec-success-blueprint",
    title: "WAEC Success Blueprint",
    description:
      "A structured study plan for WAEC — how the exam is organized, how it's graded, and how to build a revision schedule that actually works.",
    category: CourseCategory.ACADEMIC,
    instructorName: "Emeka Nwosu",
    difficulty: Difficulty.MEDIUM,
    estimatedMinutes: 50,
    learningObjectives: [
      "Explain how WAEC papers are structured and graded",
      "Build a personal revision timetable",
      "Identify common mistakes that cost students marks",
    ],
    examType: ExamType.WAEC,
    modules: [
      {
        title: "Understanding the Exam",
        lessons: [
          {
            title: "How WAEC Is Structured",
            type: LessonType.TEXT,
            content:
              "WAEC (West African Senior School Certificate Examination) tests each subject through a combination of objective (multiple choice), theory (essay/structured), and, for some subjects, practical papers. Objective papers test breadth of knowledge quickly; theory papers reward depth of explanation and correct working, not just a final answer.\n\nUnderstanding this split matters for how you prepare: cramming facts helps with objectives, but theory papers need you to practice writing full, well-organized answers under time pressure.",
          },
          {
            title: "Building a Revision Timetable",
            type: LessonType.TEXT,
            content:
              "A good revision timetable is realistic, not aspirational. Start by listing your weakest subjects — the ones that cost you the most marks in past CBT practice — and give them more sessions per week than subjects you're already strong in.\n\nBlock revision into short, focused sessions (45-60 minutes) rather than long unfocused ones, and always end a session with a few practice questions on what you just reviewed. This is exactly what the SmartPrepAfrica Study Drill mode is designed for.",
          },
        ],
      },
    ],
  },
];

async function seedCourses() {
  for (const course of courseSeeds) {
    const subjectId = course.subjectName
      ? (
          await prisma.subject.upsert({
            where: { name: course.subjectName },
            update: {},
            create: { name: course.subjectName },
          })
        ).id
      : undefined;

    const sharedFields = {
      title: course.title,
      description: course.description,
      category: course.category,
      published: true,
      instructorName: course.instructorName,
      difficulty: course.difficulty,
      estimatedMinutes: course.estimatedMinutes,
      learningObjectives: course.learningObjectives ?? [],
      priceKobo: course.priceKobo,
      subjectId,
      examType: course.examType,
    };

    await prisma.course.upsert({
      where: { id: course.id },
      update: sharedFields,
      create: { id: course.id, ...sharedFields },
    });

    // Modules cascade-delete their lessons, so this keeps re-seeding idempotent.
    await prisma.module.deleteMany({ where: { courseId: course.id } });

    for (const [moduleIndex, mod] of course.modules.entries()) {
      await prisma.module.create({
        data: {
          courseId: course.id,
          title: mod.title,
          order: moduleIndex,
          lessons: {
            create: mod.lessons.map((lesson, lessonIndex) => ({
              title: lesson.title,
              type: lesson.type,
              content: lesson.content,
              videoUrl: lesson.videoUrl,
              topic: lesson.topic,
              order: lessonIndex,
            })),
          },
        },
      });
    }
  }
}

type SeedSchool = {
  id: string;
  name: string;
  state: string;
  description: string;
  adminEmail: string;
  teacher: {
    email: string;
    name: string;
    bio: string;
    qualifications: string;
    yearsExperience: number;
  };
  course: {
    id: string;
    title: string;
    description: string;
    subjectName: string;
    examType?: ExamType;
    learningObjectives: string[];
    lessonTitle: string;
    lessonContent: string;
  };
  reviews: { comment: string; rating: number }[];
};

const marketplaceSchools: SeedSchool[] = [
  {
    id: "seed-school-rivers-comprehensive",
    name: "Rivers Comprehensive Academy",
    state: "Rivers",
    description:
      "A leading science and mathematics secondary school in Port Harcourt, known for strong WAEC and JAMB results.",
    adminEmail: "admin@riverscomprehensive.example.com",
    teacher: {
      email: "chinedu.amadi@riverscomprehensive.example.com",
      name: "Chinedu Amadi",
      bio: "Mathematics teacher with a passion for making algebra and geometry click for every student, regardless of their starting point.",
      qualifications: "B.Sc. Mathematics, PGDE",
      yearsExperience: 12,
    },
    course: {
      id: "seed-course-rivers-math-masterclass",
      title: "Mathematics Masterclass — SS1",
      description:
        "A structured SS1 Mathematics course covering algebra, geometry, and number concepts, taught by an experienced WAEC examiner.",
      subjectName: "Mathematics",
      learningObjectives: [
        "Build a solid foundation in algebraic manipulation",
        "Master geometric reasoning and proof",
        "Develop confidence tackling WAEC-style problems",
      ],
      lessonTitle: "Welcome to SS1 Mathematics",
      lessonContent:
        "This course builds the mathematical foundation you'll rely on all the way through WAEC and JAMB. We'll move from algebra fundamentals into geometry, always connecting each concept back to the kinds of questions you'll actually see in exams.\n\nBy the end of this course, problems that look intimidating today should feel like routine practice.",
    },
    reviews: [
      { rating: 5, comment: "Mr. Amadi explains algebra better than anyone at my own school." },
      { rating: 4, comment: "Really clear lessons, wish there were more practice questions." },
    ],
  },
  {
    id: "seed-school-kano-science-college",
    name: "Kano Science College",
    state: "Kano",
    description:
      "A specialist science secondary school in Kano with a strong track record in WAEC Chemistry and Physics.",
    adminEmail: "admin@kanoscience.example.com",
    teacher: {
      email: "aisha.bello@kanoscience.example.com",
      name: "Aisha Bello",
      bio: "Chemistry teacher and WAEC-certified examiner focused on building exam-ready practical and theory skills.",
      qualifications: "B.Sc. Chemistry, M.Ed.",
      yearsExperience: 9,
    },
    course: {
      id: "seed-course-kano-chemistry-bootcamp",
      title: "WAEC Chemistry Bootcamp",
      description:
        "An intensive WAEC Chemistry revision course covering atomic structure, acids and bases, and core chemical reactions.",
      subjectName: "Chemistry",
      examType: ExamType.WAEC,
      learningObjectives: [
        "Explain atomic structure and periodic trends",
        "Distinguish acids, bases, and neutral solutions confidently",
        "Balance and interpret common chemical equations",
      ],
      lessonTitle: "Atomic Structure Refresher",
      lessonContent:
        "Every chemistry topic in WAEC ultimately traces back to atomic structure — protons, neutrons, electrons, and how their arrangement determines an element's behavior.\n\nWe'll rebuild this foundation quickly, then use it to explain why elements react the way they do, which is the reasoning WAEC examiners are actually testing for in theory questions.",
    },
    reviews: [
      { rating: 5, comment: "Best Chemistry teacher I've learned from, even better than in-person classes at my school." },
    ],
  },
];

async function seedMarketplace() {
  // The first school in this dev database was created live through the
  // registration flow (dynamic id), not seeded — update it in place by
  // name rather than upserting a duplicate.
  await prisma.school.updateMany({
    where: { name: "Lagos Model Secondary School" },
    data: {
      state: "Lagos",
      verified: true,
      description:
        "A well-established secondary school in Lagos offering WAEC and JAMB preparation across core subjects.",
    },
  });

  const reviewerPasswordHash = await bcrypt.hash("demopass123", 10);
  const reviewers = await Promise.all(
    [
      { email: "demo.reviewer1@example.com", name: "Demo Reviewer One" },
      { email: "demo.reviewer2@example.com", name: "Demo Reviewer Two" },
    ].map((r) =>
      prisma.user.upsert({
        where: { email: r.email },
        update: {},
        create: {
          email: r.email,
          name: r.name,
          passwordHash: reviewerPasswordHash,
          role: "STUDENT",
          studentProfile: { create: {} },
        },
      })
    )
  );

  for (const s of marketplaceSchools) {
    const adminPasswordHash = await bcrypt.hash("demopass123", 10);
    const admin = await prisma.user.upsert({
      where: { email: s.adminEmail },
      update: {},
      create: {
        email: s.adminEmail,
        name: `${s.name} Admin`,
        passwordHash: adminPasswordHash,
        role: "SCHOOL_ADMIN",
      },
    });

    const school = await prisma.school.upsert({
      where: { id: s.id },
      update: { state: s.state, description: s.description, verified: true },
      create: {
        id: s.id,
        name: s.name,
        state: s.state,
        description: s.description,
        verified: true,
        admins: { connect: { id: admin.id } },
      },
    });
    // Idempotent: make sure the admin is connected even on re-seed.
    await prisma.school.update({
      where: { id: school.id },
      data: { admins: { connect: { id: admin.id } } },
    });

    const teacherPasswordHash = await bcrypt.hash("demopass123", 10);
    const teacherUser = await prisma.user.upsert({
      where: { email: s.teacher.email },
      update: {},
      create: {
        email: s.teacher.email,
        name: s.teacher.name,
        passwordHash: teacherPasswordHash,
        role: "TEACHER",
      },
    });
    const teacherProfile = await prisma.teacherProfile.upsert({
      where: { userId: teacherUser.id },
      update: {
        schoolId: school.id,
        bio: s.teacher.bio,
        qualifications: s.teacher.qualifications,
        yearsExperience: s.teacher.yearsExperience,
      },
      create: {
        userId: teacherUser.id,
        schoolId: school.id,
        bio: s.teacher.bio,
        qualifications: s.teacher.qualifications,
        yearsExperience: s.teacher.yearsExperience,
      },
    });

    const subject = await prisma.subject.upsert({
      where: { name: s.course.subjectName },
      update: {},
      create: { name: s.course.subjectName },
    });

    const course = await prisma.course.upsert({
      where: { id: s.course.id },
      update: {
        title: s.course.title,
        description: s.course.description,
        subjectId: subject.id,
        examType: s.course.examType,
        learningObjectives: s.course.learningObjectives,
        schoolId: school.id,
        teacherId: teacherProfile.id,
        published: true,
      },
      create: {
        id: s.course.id,
        title: s.course.title,
        description: s.course.description,
        category: CourseCategory.ACADEMIC,
        instructorName: s.teacher.name,
        difficulty: Difficulty.MEDIUM,
        estimatedMinutes: 60,
        subjectId: subject.id,
        examType: s.course.examType,
        learningObjectives: s.course.learningObjectives,
        schoolId: school.id,
        teacherId: teacherProfile.id,
        published: true,
      },
    });

    await prisma.module.deleteMany({ where: { courseId: course.id } });
    await prisma.module.create({
      data: {
        courseId: course.id,
        title: "Getting Started",
        order: 0,
        lessons: {
          create: [
            {
              title: s.course.lessonTitle,
              type: LessonType.TEXT,
              content: s.course.lessonContent,
              order: 0,
            },
          ],
        },
      },
    });

    await prisma.courseReview.deleteMany({ where: { courseId: course.id } });
    for (const [i, review] of s.reviews.entries()) {
      const reviewer = reviewers[i % reviewers.length];
      await prisma.courseReview.create({
        data: {
          courseId: course.id,
          userId: reviewer.id,
          rating: review.rating,
          comment: review.comment,
        },
      });
    }
  }
}

// Default partner-program configuration: sensible starting compensation
// rules and tier thresholds an admin can edit later from the admin UI.
// Idempotent — only creates version 1 of a rule if that ruleKey has no
// rows yet, so re-running the seed never overwrites an admin's later edits.
async function seedPartnerDefaults() {
  const defaultRules: Array<{
    ruleKey: string;
    name: string;
    description: string;
    eventType: "STUDENT_FIRST_SUBSCRIPTION" | "SCHOOL_ACTIVATION" | "SCHOOL_STUDENT_ACTIVATION";
    calcType: "FIXED" | "PERCENTAGE";
    fixedAmountKobo?: number;
    percentage?: number;
    maxAmountKobo?: number;
    qualificationHoldDays: number;
  }> = [
    {
      ruleKey: "student_first_subscription",
      name: "Student Referral — First Subscription",
      description: "Paid after a referred student's first qualifying paid subscription.",
      eventType: "STUDENT_FIRST_SUBSCRIPTION",
      calcType: "FIXED",
      fixedAmountKobo: 50_000, // ₦500
      qualificationHoldDays: 14,
    },
    {
      ruleKey: "school_activation",
      name: "School Referral — School Activation",
      description: "Paid when a referred school becomes a paying school.",
      eventType: "SCHOOL_ACTIVATION",
      calcType: "FIXED",
      fixedAmountKobo: 2_500_000, // ₦25,000
      qualificationHoldDays: 14,
    },
    {
      ruleKey: "school_student_activation",
      name: "School Referral — Per Activated Student",
      description: "Paid per paying student at a referred school, capped.",
      eventType: "SCHOOL_STUDENT_ACTIVATION",
      calcType: "FIXED",
      fixedAmountKobo: 25_000, // ₦250
      qualificationHoldDays: 14,
    },
  ];

  for (const rule of defaultRules) {
    const existing = await prisma.partnerCommissionRule.findFirst({ where: { ruleKey: rule.ruleKey } });
    if (existing) continue;
    await prisma.partnerCommissionRule.create({
      data: { ...rule, version: 1, isActive: true },
    });
  }

  const defaultTiers = [
    { name: "Starter", minPaidStudents: 0, sortOrder: 0, perks: "Base commission rates." },
    { name: "Silver", minPaidStudents: 50, sortOrder: 1, perks: "Priority support." },
    { name: "Gold", minPaidStudents: 200, sortOrder: 2, perks: "Priority support, early payouts." },
    { name: "Platinum", minPaidStudents: 500, sortOrder: 3, perks: "Dedicated support, early payouts, campaign bonuses." },
  ];
  for (const tier of defaultTiers) {
    await prisma.partnerTier.upsert({
      where: { name: tier.name },
      update: {},
      create: tier,
    });
  }
}

// Seeds version 1 of each legal document type if none exists yet.
// Idempotent — never overwrites an admin's later edits (those create v2+).
async function seedLegalDefaults() {
  const documents: Array<{ type: "TERMS" | "PRIVACY" | "PARTNER_PROGRAM"; title: string; content: string }> = [
    { type: "TERMS", title: "Terms & Conditions", content: TERMS_CONTENT },
    { type: "PRIVACY", title: "Privacy Policy", content: PRIVACY_CONTENT },
    { type: "PARTNER_PROGRAM", title: "SmartPrepAfrica.com Partner Program Terms", content: PARTNER_TERMS_CONTENT },
  ];

  for (const doc of documents) {
    const existing = await prisma.legalDocument.findFirst({ where: { type: doc.type } });
    if (existing) continue;
    await prisma.legalDocument.create({
      data: { type: doc.type, version: 1, isActive: true, title: doc.title, content: doc.content },
    });
  }
}

const TERMS_CONTENT = `## 1. Acceptance of Terms

By creating an account, accessing, or using SmartPrepAfrica.com, you agree to be bound by these Terms & Conditions. If you do not agree, do not use the platform. SmartPrepAfrica.com is a Cicerah Technologies Limited company.

## 2. Eligibility and Accounts

SmartPrepAfrica.com supports several account types: **Student**, **Parent**, **Teacher**, **School**, **Sponsor**, and **Partner**. Each account type may have different features and responsibilities, but all account holders are responsible for maintaining the confidentiality of their login credentials and for all activity that occurs under their account.

Where a student is a minor, appropriate parent, guardian, school, or other authorized adult consent may be required before the account is used, consistent with how the account was created (for example, a school-managed roster or a parent-linked account).

## 3. Educational Services

SmartPrepAfrica.com provides access to educational materials, courses, examination preparation resources, assessments, an AI-assisted study coach, and related educational services. SmartPrepAfrica.com does not guarantee examination success, admission to any institution, specific grades, employment outcomes, or any other academic or career outcome. Results depend on many factors outside the platform's control.

## 4. Exam Preparation

SmartPrepAfrica.com's exam-preparation tools provide practice materials intended to support preparation for examinations such as WAEC, JAMB, NECO, Post-UTME, and similar assessments where available. Practice content may include original SmartPrepAfrica.com-authored questions, AI-generated practice content, and, where explicitly indicated, licensed past questions. SmartPrepAfrica.com does not claim affiliation, accreditation, or partnership with any examination body unless such an agreement actually exists and is disclosed.

## 5. AI Study Coach

The AI Study Coach generates responses to support your learning. AI-generated responses may occasionally be incomplete or contain errors, are not a substitute for a qualified teacher or official course materials, and should be independently verified where accuracy matters (for example, before an exam or assignment deadline).

## 6. Courses and Schools

Some courses on SmartPrepAfrica.com are provided by independent schools, teachers, or educational organizations through the SmartPrepAfrica.com course marketplace. Where a course is provided by a third party, SmartPrepAfrica.com acts as the platform connecting learners to that provider and is not itself the creator of that third party's course content.

## 7. Payments and Subscriptions

Certain features require a paid subscription. Pricing, billing cycles, and renewal are shown at the point of purchase and are processed through SmartPrepAfrica.com's integrated payment provider. Applicable taxes, where required by law, may be added to the displayed price. If a payment fails, access to paid features may be limited until payment is resolved.

## 8. Refunds

Refund eligibility depends on the specific plan and payment terms shown at the time of purchase. *SmartPrepAfrica.com's detailed refund policy (eligible circumstances, request windows, and process) is being finalized and will be published here before being relied upon commercially. Until then, refund requests are reviewed case by case — contact [Support](/contact).*

## 9. Partner Program

Partners may refer students and schools to SmartPrepAfrica.com through their unique referral link. Referring a user does **not**, by itself, create a payable commission — a referral only becomes a payable commission once it meets the qualification criteria defined by SmartPrepAfrica.com's active compensation rules (for example, a qualifying paid conversion and expiry of any applicable review/hold period). SmartPrepAfrica.com may reverse a commission if the underlying transaction is refunded or charged back. Fraudulent, manipulated, or duplicate referrals may be flagged, investigated, and — where confirmed — result in forfeiture of the associated commission and suspension of the partner account. Where two partners submit competing claims to the same school, SmartPrepAfrica.com resolves the dispute administratively rather than automatically reassigning attribution. Payouts require meeting the applicable minimum threshold and are subject to admin review before being marked complete.

## 10. Acceptable Use

You agree not to: engage in fraud or attempt to manipulate referrals, commissions, or subscriptions; share your account where not authorized by your account type; attempt to compromise, scrape, or reverse-engineer the platform; circumvent subscription or payment controls; abuse or attempt to manipulate the AI Study Coach; cheat on or otherwise misuse assessment functionality; upload unlawful content; harass other users; or impersonate any person or organization.

## 11. Intellectual Property

The SmartPrepAfrica.com platform software, branding, and logos are owned by Cicerah Technologies Limited (or its licensors) and may not be used without permission. Course content, assessments, and other materials remain the property of their respective creators (SmartPrepAfrica.com, participating schools, teachers, or other content providers), subject to the license under which they are made available on the platform. AI-generated study materials are provided for your personal educational use. SmartPrepAfrica.com respects third-party intellectual property rights.

## 12. User Content

Content you, your school, or your teachers upload or submit (such as course materials, assignments, or submissions) remains owned by its creator, but you grant SmartPrepAfrica.com the license necessary to host, display, and deliver that content as part of the platform's normal operation.

## 13. Suspension and Termination

SmartPrepAfrica.com may suspend or terminate an account that violates these Terms, is used fraudulently, or poses a risk to the platform or other users. Where practical, SmartPrepAfrica.com will provide notice of the reason.

## 14. Limitation of Liability

To the fullest extent permitted by law, SmartPrepAfrica.com is not liable for indirect, incidental, or consequential damages arising from use of the platform, including but not limited to academic outcomes, examination results, or third-party course content. Nothing in these Terms limits liability where such limitation is not permitted by applicable law.

## 15. Changes to Terms

SmartPrepAfrica.com may update these Terms from time to time. The effective date at the top of this page reflects the version currently in force. Continued use of the platform after an update constitutes acceptance of the revised Terms.

## 16. Contact

Questions about these Terms can be sent through our [Contact page](/contact).`;

const PRIVACY_CONTENT = `## 1. Information We Collect

Depending on your account type and how you use SmartPrepAfrica.com, we may collect: your name, email address, and account credentials; role-specific profile details (for example, a student's grade level and target exams, a school's name and address, a partner's phone number and payout details); course enrollment and learning activity (progress, quiz and practice results, topic mastery, AI Study Coach conversations); subscription and payment status (processed through our payment provider — see Payments below); partner referral identifiers used to attribute registrations; device/browser information captured automatically (such as user-agent); and any message you send us through the Contact form.

We only describe data categories the platform actually collects, based on its current data model — not every category listed above applies to every account type.

## 2. Student Learning Data

For students, we collect course progress, quiz and exam results, topic-level mastery signals, and study activity in order to power features like progress tracking, weak-topic recommendations, and certificates. This data is used to support the student's own learning and, where a parent or school account is linked, to give that parent or school appropriate visibility into progress — not to build a profile for unrelated purposes.

## 3. AI Study Coach Privacy

When you use the AI Study Coach, relevant learning context (such as the topic you're studying or a recent quiz result) may be sent to our AI provider to generate a personalized response. We aim to send only the information needed to answer your question. We do not use your AI Coach conversations to train external AI models.

## 4. Children and Students

SmartPrepAfrica.com serves school-age users through student, parent, and school accounts. Where a student account is created and managed by a school (for example, via bulk roster upload) or linked to a parent account, that school or parent is responsible for the underlying consent to create the account. We aim to collect only the information needed to provide the educational service, and do not require students to provide more personal information than necessary to use the platform. We do not make specific legal-compliance certifications (e.g., under a named children's privacy law) unless such a certification has actually been obtained.

## 5. Payments

Subscription payments are processed through our integrated third-party payment provider (Paystack). SmartPrepAfrica.com does not store your full card number or other full payment-card details — payment processing is handled by the payment provider, and SmartPrepAfrica.com retains only the transaction status, amount, and reference needed to manage your subscription.

## 6. Partner Referral Data

If you were referred to SmartPrepAfrica.com through a partner's link, we store a referral identifier and related attribution details (such as the click and registration timestamps) in order to correctly attribute your registration and, where applicable, calculate the referring partner's eligible commission.

## 7. Cookies and Similar Technologies

We use cookies for purposes such as: keeping you signed in (authentication/session management); remembering a partner referral link you followed, so attribution isn't lost if you don't register immediately; and, where configured, basic usage analytics to help us understand how the platform is used.

## 8. How Information Is Used

We use the information described above to: provide and operate the educational services you sign up for; personalize learning recommendations; track progress and issue certificates; process subscriptions and payments; operate school- and parent-managed accounts; provide the AI Study Coach; attribute partner referrals and calculate eligible commissions; detect and prevent fraud; respond to support and contact requests; improve platform performance and reliability; and meet applicable legal obligations.

## 9. Data Sharing

We share information only as needed to operate the platform: with service providers who help us run SmartPrepAfrica.com (such as our hosting, database, and payment infrastructure providers); with a student's own school or linked parent account, where that relationship exists; with a course's instructor or school, limited to what's needed to support that course; and with our payment provider, to process subscriptions. **We do not sell personal data.**

## 10. Data Retention

We retain account and learning data for as long as your account is active and as needed to provide the service, resolve disputes, and meet legal and financial record-keeping obligations. Specific retention periods for each data category are being finalized as part of our data-governance process.

## 11. Security

We apply reasonable technical and organizational safeguards to protect your information, including password hashing and access controls. No system can be guaranteed 100% secure, and we cannot promise absolute security of information transmitted to or stored on the platform.

## 12. Your Rights

You may request access to, correction of, or deletion of your personal information, or ask us to close your account, by contacting us through the [Contact page](/contact). We will respond to verified requests consistent with our obligations and the platform's operational requirements (for example, a school-managed account may require the school's involvement to close).

## 13. Changes to This Policy

We may update this Privacy Policy from time to time. The effective date above reflects the version currently in force.

## 14. Contact

Questions about this Privacy Policy can be sent through our [Contact page](/contact).`;

const PARTNER_TERMS_CONTENT = `## SmartPrepAfrica.com Partner Program Terms

By applying to the SmartPrepAfrica.com Partner Program, you agree to the following, in addition to SmartPrepAfrica.com's general [Terms & Conditions](/terms):

- Commissions are payable **only** for referrals that meet the qualification criteria under SmartPrepAfrica.com's active, admin-configured compensation rules at the time of the underlying event — not simply for a link click or registration.
- SmartPrepAfrica.com may reverse a pending or already-approved commission if the underlying payment is refunded, charged back, or found to be fraudulent.
- Referral attribution is recorded server-side at registration and is not editable by the referred user or the partner after the fact.
- Where two partners submit competing claims to the same school, SmartPrepAfrica.com resolves the dispute administratively; attribution is never automatically reassigned by a later click.
- Suspicious referral activity (including but not limited to self-referral, duplicate accounts, or fabricated students or schools) may be flagged for review and can result in commission forfeiture and/or partner account suspension.
- Payouts require reaching the applicable minimum threshold and are subject to admin approval before being marked complete.
- SmartPrepAfrica.com does not guarantee any specific level of income from the Partner Program.

I agree to the SmartPrepAfrica.com Partner Program Terms and understand that commissions are payable only for qualifying conversions under the applicable compensation rules.`;

async function main() {
  const subjectNames = Array.from(new Set(allQuestions.map((q) => q.subject)));
  const subjects = await Promise.all(
    subjectNames.map((name) =>
      prisma.subject.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );
  const subjectIdByName = new Map(subjects.map((s) => [s.name, s.id]));

  // Attempts reference questions; clear them so re-seeding the question bank
  // doesn't hit a foreign key constraint. Fine for a dev seed script.
  await prisma.examAttempt.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.question.createMany({
    data: allQuestions.map((q) => ({
      exam: q.exam,
      subjectId: subjectIdByName.get(q.subject)!,
      topic: q.topic,
      difficulty: q.difficulty ?? Difficulty.MEDIUM,
      prompt: q.prompt,
      options: q.options.map((text, i) => ({ key: OPTION_KEYS[i], text })),
      correctOption: OPTION_KEYS[q.correctIndex],
      explanation: q.explanation,
    })),
  });

  await seedCourses();
  await seedMarketplace();
  await seedPartnerDefaults();
  await seedLegalDefaults();

  console.log(
    `Seed complete: ${allQuestions.length} questions across ${subjects.length} subjects, ${courseSeeds.length + marketplaceSchools.length} courses, ${marketplaceSchools.length} marketplace schools.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
