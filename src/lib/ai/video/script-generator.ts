import { generateObject } from "ai";
import { z } from "zod";
import type { VideoType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getVideoScriptModel, getVideoScriptModelId, isVideoAiConfigured } from "@/lib/ai/video/provider";
import { estimateCostKobo } from "@/lib/ai/pricing";

const SCENE_TYPES = [
  "HOOK",
  "BRAND_INTRO",
  "LEARNING_OBJECTIVE",
  "CONCEPT",
  "DEFINITION",
  "EXAMPLE",
  "WORKED_EXAMPLE",
  "EQUATION",
  "DIAGRAM",
  "ANIMATION",
  "COMPARISON",
  "EXAM_TIP",
  "WAEC_QUESTION",
  "MULTIPLE_CHOICE",
  "QUESTION_TIMER",
  "ANSWER_REVEAL",
  "SUMMARY",
  "CALL_TO_ACTION",
  "OUTRO",
] as const;

const generatedSceneSchema = z.object({
  sceneType: z.enum(SCENE_TYPES),
  title: z.string(),
  estimatedDurationSec: z.number().int().min(3).max(180),
  narration: z.string().nullable(),
  onScreenText: z.string().nullable(),
  visualDirection: z.string().nullable(),
  animationInstructions: z.string().nullable(),
  learningObjective: z.string().nullable(),
  equation: z.string().nullable(),
  diagramDescription: z.string().nullable(),
  // Only meaningful for WAEC_QUESTION/MULTIPLE_CHOICE scenes.
  questionPrompt: z.string().nullable(),
  questionOptions: z.array(z.object({ key: z.string(), text: z.string() })).nullable(),
  questionAnswer: z.string().nullable(),
  questionExplanation: z.string().nullable(),
});

const scriptSchema = z.object({
  scenes: z.array(generatedSceneSchema).min(3),
});

export type GeneratedScene = z.infer<typeof generatedSceneSchema>;

type GenerationResult =
  | { ok: true; scenes: GeneratedScene[]; inputTokens: number; outputTokens: number }
  | { ok: false; error: string; inputTokens: number; outputTokens: number };

const VIDEO_TYPE_INSTRUCTIONS: Record<VideoType, string> = {
  FULL_LESSON:
    "A complete lesson covering the topic thoroughly, ending with exam practice and a summary.",
  QUICK_REVISION: "A fast-paced revision run-through hitting only the highest-yield exam points.",
  PAST_QUESTION_WALKTHROUGH:
    "Walk through one or more real past exam questions on this topic step by step.",
  CONCEPT_EXPLAINER: "Explain one core concept clearly with a strong analogy and a worked example.",
  WORKED_EXAMPLE: "Work through calculation(s) or problem(s) on this topic step by step.",
  PRACTICAL_DEMONSTRATION: "Describe a practical/laboratory demonstration relevant to this topic.",
  EXAM_TIPS: "Focus on exam technique, common mistakes, and marking-scheme expectations for this topic.",
  TOPIC_SUMMARY: "A concise summary of everything a student needs to remember about this topic.",
  YOUTUBE_SHORT: "An extremely tight, single-idea short-form video (under 60 seconds).",
  REVISION_SHORT: "A short, punchy revision clip covering one key fact or formula.",
};

/** Real Claude call producing structured scenes — the first generateObject
 * usage in this codebase (the AI Study Coach only ever streams free text).
 * Always logs a VideoGenerationLog row, success or failure, with real
 * token counts — never fabricates a response when the API key is unset;
 * callers must check isVideoAiConfigured() first. */
export async function generateVideoScript(opts: {
  projectId: string;
  subjectName: string;
  topic: string;
  gradeLevel: string | null;
  videoType: VideoType;
  targetDurationSec: number;
  learningObjectives: string[];
  examLabel: string;
}): Promise<GenerationResult> {
  const startedAt = new Date();

  if (!isVideoAiConfigured()) {
    await prisma.videoGenerationLog.create({
      data: {
        projectId: opts.projectId,
        stage: "SCRIPT_GENERATION",
        model: getVideoScriptModelId(),
        status: "FAILED",
        errorMessage: "AI generation is not configured. Set ANTHROPIC_API_KEY.",
        startedAt,
        completedAt: new Date(),
      },
    });
    return { ok: false, error: "AI generation is not configured. Set ANTHROPIC_API_KEY.", inputTokens: 0, outputTokens: 0 };
  }

  const existingQuestions = await prisma.question.findMany({
    where: { subject: { name: opts.subjectName }, status: "PUBLISHED", topic: { contains: opts.topic, mode: "insensitive" } },
    select: { id: true, prompt: true, options: true, correctOption: true, explanation: true },
    take: 5,
  });

  const questionBank = existingQuestions.length
    ? `\n\nReal published questions already in the SmartPrepAfrica question bank for this topic (id: prompt):\n${existingQuestions
        .map((q) => `- ${q.id}: ${q.prompt}`)
        .join("\n")}\nWhen a WAEC_QUESTION or MULTIPLE_CHOICE scene fits one of these well, you may reference it — otherwise write a new practice question.`
    : "";

  const objectivesList = opts.learningObjectives.length
    ? opts.learningObjectives.map((o, i) => `${i + 1}. ${o}`).join("\n")
    : "(none specified — infer reasonable objectives from the topic)";

  const prompt = `You are writing a scene-by-scene script for a faceless, presenter-free educational video for SmartPrepAfrica, an African secondary-school exam-prep platform.

Exam: ${opts.examLabel}
Subject: ${opts.subjectName}
${opts.gradeLevel ? `Grade level: ${opts.gradeLevel}\n` : ""}Topic: ${opts.topic}
Video type: ${opts.videoType} — ${VIDEO_TYPE_INSTRUCTIONS[opts.videoType]}
Target total duration: approximately ${opts.targetDurationSec} seconds

Learning objectives:
${objectivesList}
${questionBank}

Write the video as an ordered array of scenes. Start with a HOOK scene, include a BRAND_INTRO scene right after it (SmartPrepAfrica, tagline "Learn • Practice • Succeed", 3-5 seconds, narration null, onScreenText only), cover the concept thoroughly across CONCEPT/DEFINITION/EXAMPLE/WORKED_EXAMPLE/EQUATION/DIAGRAM scenes as appropriate for the subject, include at least one WAEC_QUESTION or MULTIPLE_CHOICE scene with a genuine exam-style question (fill questionPrompt/questionOptions/questionAnswer/questionExplanation; leave those null on every other scene type), end with a SUMMARY and a CALL_TO_ACTION/OUTRO. Keep narration natural and spoken, never a wall of text. onScreenText should be short — a few words or a phrase, not full sentences. For any scientific or mathematical notation, put it in the equation field as valid LaTeX (e.g. "HCl + NaOH \\rightarrow NaCl + H_2O", "Zn^{2+}", "x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}") so it can be rendered with KaTeX — never inside narration or onScreenText, and never as plain unformatted text. Scene durations should sum to roughly the target duration.`;

  try {
    const result = await generateObject({
      model: getVideoScriptModel(),
      schema: scriptSchema,
      prompt,
    });

    await prisma.videoGenerationLog.create({
      data: {
        projectId: opts.projectId,
        stage: "SCRIPT_GENERATION",
        model: getVideoScriptModelId(),
        status: "SUCCEEDED",
        inputTokens: result.usage.inputTokens ?? 0,
        outputTokens: result.usage.outputTokens ?? 0,
        estimatedCostKobo: estimateCostKobo(result.usage.inputTokens ?? 0, result.usage.outputTokens ?? 0),
        startedAt,
        completedAt: new Date(),
      },
    });

    return {
      ok: true,
      scenes: result.object.scenes,
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Script generation failed.";
    await prisma.videoGenerationLog.create({
      data: {
        projectId: opts.projectId,
        stage: "SCRIPT_GENERATION",
        model: getVideoScriptModelId(),
        status: "FAILED",
        errorMessage: message,
        startedAt,
        completedAt: new Date(),
      },
    });
    return { ok: false, error: message, inputTokens: 0, outputTokens: 0 };
  }
}

/** Regenerates a single scene in place, given the surrounding context —
 * component-level regeneration so an admin never has to redo a whole
 * project to fix one scene. */
export async function regenerateVideoScene(opts: {
  projectId: string;
  subjectName: string;
  topic: string;
  examLabel: string;
  sceneType: string;
  currentTitle: string;
  instructions?: string;
}): Promise<{ ok: true; scene: GeneratedScene } | { ok: false; error: string }> {
  const startedAt = new Date();

  if (!isVideoAiConfigured()) {
    return { ok: false, error: "AI generation is not configured. Set ANTHROPIC_API_KEY." };
  }

  const prompt = `You are rewriting ONE scene of an existing educational video script for SmartPrepAfrica.

Exam: ${opts.examLabel}
Subject: ${opts.subjectName}
Topic: ${opts.topic}
Scene type: ${opts.sceneType}
Current scene title: ${opts.currentTitle}
${opts.instructions ? `Admin instructions for this rewrite: ${opts.instructions}` : "Improve clarity and engagement while keeping the same scene type and purpose."}

Return exactly one scene matching the scene type ${opts.sceneType}. For any scientific or mathematical notation, use the equation field as valid LaTeX (e.g. "HCl + NaOH \\rightarrow NaCl + H_2O"), never inside narration/onScreenText. If this is not a question scene, leave the question fields null.`;

  try {
    const result = await generateObject({
      model: getVideoScriptModel(),
      schema: generatedSceneSchema,
      prompt,
    });

    await prisma.videoGenerationLog.create({
      data: {
        projectId: opts.projectId,
        stage: "SCENE_REGENERATION",
        model: getVideoScriptModelId(),
        status: "SUCCEEDED",
        inputTokens: result.usage.inputTokens ?? 0,
        outputTokens: result.usage.outputTokens ?? 0,
        estimatedCostKobo: estimateCostKobo(result.usage.inputTokens ?? 0, result.usage.outputTokens ?? 0),
        startedAt,
        completedAt: new Date(),
      },
    });

    return { ok: true, scene: result.object };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scene regeneration failed.";
    await prisma.videoGenerationLog.create({
      data: {
        projectId: opts.projectId,
        stage: "SCENE_REGENERATION",
        model: getVideoScriptModelId(),
        status: "FAILED",
        errorMessage: message,
        startedAt,
        completedAt: new Date(),
      },
    });
    return { ok: false, error: message };
  }
}

const objectivesSchema = z.object({ objectives: z.array(z.string()).min(3).max(12) });

/** Powers the wizard's "Generate with AI" button for learning objectives.
 * Not tied to a project yet (called before one exists), so it doesn't
 * write a VideoGenerationLog row — there's no project to attach it to. */
export async function suggestLearningObjectives(opts: {
  subjectName: string;
  topic: string;
  examLabel: string;
}): Promise<{ ok: true; objectives: string[] } | { ok: false; error: string }> {
  if (!isVideoAiConfigured()) {
    return { ok: false, error: "AI generation is not configured. Set ANTHROPIC_API_KEY." };
  }
  try {
    const result = await generateObject({
      model: getVideoScriptModel(),
      schema: objectivesSchema,
      prompt: `List clear, exam-focused learning objectives for a ${opts.examLabel} ${opts.subjectName} video on the topic "${opts.topic}". Phrase each as "Students should be able to <verb> ...". Return 5-9 objectives.`,
    });
    return { ok: true, objectives: result.object.objectives };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not generate objectives." };
  }
}
