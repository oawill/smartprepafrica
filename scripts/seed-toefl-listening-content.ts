import { PrismaClient } from "@prisma/client";
import { isVoiceConfigured } from "../src/lib/ai/voice/provider";
import { openAiVoiceProvider } from "../src/lib/ai/voice/openai-provider";
import { isBlobStorageConfigured, uploadAudio } from "../src/lib/storage/blob-storage";

const prisma = new PrismaClient();

// Same pattern as scripts/seed-toefl-reading-content.ts, but each item's
// audio is real, generated narration (reusing the exact TTS provider and
// Blob storage already built for Video Learning Studio narration) rather
// than a pre-recorded file. All scripts are original, not sourced from
// ETS/official TOEFL material.
const LISTENING_ITEMS = [
  {
    slug: "toefl-listening-001",
    difficulty: "EASY" as const,
    transcript:
      "Professor: Good morning, everyone. Today I want to talk briefly about a shift in how many companies handle customer support. For decades, most support was handled entirely by phone or in person. Over the past ten years, though, live chat and automated messaging have become the first line of contact for a huge share of companies. One reason is cost: a single support agent can often manage several chat conversations at once, but only one phone call. Another reason is customer preference — surveys consistently show that many customers, especially younger ones, would rather type a quick message than wait on hold. That said, phone support hasn't disappeared. Complex or emotionally sensitive issues, like a billing dispute or a cancellation, are still usually escalated to a live phone conversation.",
    prompt: "According to the professor, why do many companies prefer live chat over phone support?",
    options: [
      { key: "A", text: "Chat is required by new government regulations." },
      { key: "B", text: "A single agent can handle multiple chat conversations at once, unlike a phone call." },
      { key: "C", text: "Phone support has become technically obsolete." },
      { key: "D", text: "Customers are legally required to use chat first." },
    ],
    correctOption: "B",
    explanation:
      "The professor states that 'a single support agent can often manage several chat conversations at once, but only one phone call' — this cost/efficiency advantage matches option B.",
    tags: ["business", "technology"],
  },
  {
    slug: "toefl-listening-002",
    difficulty: "MEDIUM" as const,
    transcript:
      "Student: Hi, I was hoping to ask about the research methods course for next semester. I noticed it has a prerequisite listed, but I'm not sure if my background covers it. Advisor: Sure, what have you taken so far? Student: I took introductory statistics last year, but not the research design course. Advisor: That should actually be fine. The prerequisite is really there to make sure students understand basic statistical concepts — things like sample size and variability — before they design their own study. The research design course goes deeper into that, but it's not strictly required if you've already got a solid statistics foundation. I'd recommend meeting with the course instructor during office hours just to confirm, but based on what you've described, you should be able to enroll without an override.",
    prompt: "What does the advisor tell the student about the course prerequisite?",
    options: [
      { key: "A", text: "The student must retake introductory statistics before enrolling." },
      { key: "B", text: "The prerequisite cannot be waived under any circumstances." },
      { key: "C", text: "A solid statistics background is likely sufficient, though confirming with the instructor is still advisable." },
      { key: "D", text: "The research design course is a mandatory requirement with no exceptions." },
    ],
    correctOption: "C",
    explanation:
      "The advisor says the student 'should be able to enroll without an override' based on their statistics background, while still recommending they 'meet with the course instructor... just to confirm' — matching option C.",
    tags: ["campus life", "academic advising"],
  },
  {
    slug: "toefl-listening-003",
    difficulty: "MEDIUM" as const,
    transcript:
      "Professor: Let's turn to an interesting case in animal behavior: the way some bird species use tools. For a long time, tool use was considered a mark of unusually high intelligence, seen only in a handful of species like chimpanzees. But researchers studying New Caledonian crows found something remarkable — these birds not only use twigs to extract insects from tree bark, they actually modify the twigs first, stripping off leaves and shaping the end into a hook. What's especially notable is that young crows appear to learn this technique partly through observation of adults, and partly through their own trial and error, suggesting a combination of social learning and individual problem-solving. This has led some researchers to argue that tool manufacture, not just tool use, should be considered stronger evidence of complex cognition in animals.",
    prompt: "What is notable about how young New Caledonian crows learn to use tools, according to the professor?",
    options: [
      { key: "A", text: "They learn exclusively by copying their parents with no individual experimentation." },
      { key: "B", text: "They are born already knowing how to shape twigs into hooks." },
      { key: "C", text: "Their learning combines observing adults and their own trial and error." },
      { key: "D", text: "They only learn the technique in captivity, not in the wild." },
    ],
    correctOption: "C",
    explanation:
      "The professor states young crows learn 'partly through observation of adults, and partly through their own trial and error, suggesting a combination of social learning and individual problem-solving' — matching option C.",
    tags: ["science", "biology"],
  },
  {
    slug: "toefl-listening-004",
    difficulty: "HARD" as const,
    transcript:
      "Professor: One thing that surprises a lot of students studying economic history is how differently early stock exchanges operated compared to today. Take the Amsterdam exchange in the seventeenth century, widely considered one of the first formal stock exchanges. Trading didn't happen through anything resembling a modern trading floor with real-time price boards. Instead, merchants gathered in a courtyard, and prices were often negotiated individually between buyers and sellers, sometimes settled only after extended, almost ritualized bargaining. Information about prices elsewhere traveled slowly — by letter or by ship — which meant that a merchant in Amsterdam might be trading on price information that was, by the standards we're used to today, dangerously out of date. And yet, remarkably, many of the financial instruments that emerged there — including short selling and options contracts — would still be recognizable to a modern trader.",
    prompt: "According to the professor, what is surprising about financial instruments used on the early Amsterdam exchange?",
    options: [
      { key: "A", text: "They were entirely different from anything used in modern finance." },
      { key: "B", text: "Instruments like short selling and options would still be recognizable to a modern trader." },
      { key: "C", text: "They were banned shortly after being introduced." },
      { key: "D", text: "They required real-time electronic price boards to function." },
    ],
    correctOption: "B",
    explanation:
      "The professor concludes that 'many of the financial instruments that emerged there — including short selling and options contracts — would still be recognizable to a modern trader,' directly matching option B.",
    tags: ["history", "economics"],
  },
  {
    slug: "toefl-listening-005",
    difficulty: "EASY" as const,
    transcript:
      "Student: Excuse me, I'm trying to find the reserved books for my literature class, but I can't seem to locate the section. Librarian: Ah, we actually moved reserve materials last month — they used to be behind the main desk, but now they're on the second floor, right next to the study rooms. You'll need your student ID to check them out, and most reserve items can only be borrowed for two hours at a time, so they stay available for other students in the class. Student: Two hours, got it. Is there a way to renew if I'm still using it? Librarian: Unfortunately, no — reserve items can't be renewed the way regular books can, precisely because so many students in the same class need access to them. If you need more time, your best bet is to return it and check it out again once the two hours are up, as long as no one else has it reserved.",
    prompt: "According to the librarian, why can't reserve items be renewed?",
    options: [
      { key: "A", text: "Reserve items are permanently out of circulation after two hours." },
      { key: "B", text: "The library no longer allows any student to borrow reserve materials." },
      { key: "C", text: "So many students in the same class need access, renewal would block others from using them." },
      { key: "D", text: "Renewal requires a special form that is no longer issued." },
    ],
    correctOption: "C",
    explanation:
      "The librarian explains reserve items can't be renewed 'precisely because so many students in the same class need access to them' — matching option C.",
    tags: ["campus life", "library"],
  },
];

async function main() {
  if (!isVoiceConfigured()) {
    throw new Error("OPENAI_API_KEY is not set — cannot generate real listening audio. Set it and re-run.");
  }
  if (!isBlobStorageConfigured()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set — cannot store generated audio. Set it and re-run.");
  }

  for (const item of LISTENING_ITEMS) {
    const existing = await prisma.toeflContent.findFirst({
      where: { skill: "LISTENING", taskType: "LISTENING_MCQ", prompt: item.prompt },
    });
    if (existing) {
      console.log(`Already seeded: ${item.slug}`);
      continue;
    }

    console.log(`Generating audio: ${item.slug}...`);
    const speech = await openAiVoiceProvider.generateSpeech({ text: item.transcript, voiceId: "alloy" });
    const { url } = await uploadAudio({
      pathname: `toefl/listening/${item.slug}.mp3`,
      data: speech.audio,
      contentType: "audio/mpeg",
    });

    await prisma.toeflContent.create({
      data: {
        skill: "LISTENING",
        taskType: "LISTENING_MCQ",
        difficulty: item.difficulty,
        status: "PUBLISHED",
        audioUrl: url,
        audioDurationSec: speech.estimatedDurationSec,
        transcript: item.transcript,
        prompt: item.prompt,
        options: item.options,
        correctOption: item.correctOption,
        explanation: item.explanation,
        estimatedTimeSec: Math.round(speech.estimatedDurationSec + 30),
        tags: item.tags,
      },
    });
    console.log(`Created: ${item.slug} (${url})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
