"use client";

import { useState, useTransition } from "react";
import type { VideoProject, VideoScene, Question, Country, CountryExam, Exam, ExamBody, Subject, ExamTopic, VideoRenderJob } from "@prisma/client";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Label, Textarea, Input } from "@/components/ui/form";
import { EquationDisplay } from "@/components/admin/video-studio/equation-display";
import {
  generateScriptAction,
  regenerateSceneAction,
  updateSceneAction,
  reorderSceneAction,
  duplicateSceneAction,
  deleteSceneAction,
  searchQuestionsAction,
  assignExistingQuestionAction,
  clearSceneQuestionAction,
  updateProjectMetaAction,
  submitForReviewAction,
  approveScriptAction,
  generateSceneVoiceAction,
  generateAllVoicesAction,
  queueRenderJobAction,
  cancelRenderJobAction,
  retryRenderJobAction,
} from "@/app/dashboard/admin/video-studio/[id]/actions";

type FullProject = VideoProject & {
  subject: Subject;
  countryExam: CountryExam & { country: Country; exam: Exam & { examBody: ExamBody } };
  examTopic: ExamTopic | null;
  createdBy: { name: string };
  scenes: (VideoScene & { question: Pick<Question, "id" | "prompt" | "correctOption"> | null })[];
  renderJobs: VideoRenderJob[];
};

const STATUS_TONE: Record<string, BadgeTone> = {
  DRAFT: "neutral",
  SCRIPT_GENERATING: "info",
  SCRIPT_READY: "info",
  NEEDS_REVIEW: "warning",
  SCRIPT_APPROVED: "success",
  VOICE_GENERATING: "info",
  READY_TO_RENDER: "info",
  RENDERING: "info",
  RENDER_COMPLETE: "success",
  RENDER_FAILED: "danger",
};

const VOICE_STATUS_TONE: Record<string, BadgeTone> = {
  NOT_STARTED: "neutral",
  GENERATING: "info",
  READY: "success",
  FAILED: "danger",
};

const RENDER_STATUS_TONE: Record<string, BadgeTone> = {
  QUEUED: "neutral",
  RENDERING: "info",
  COMPLETE: "success",
  FAILED: "danger",
  CANCELLED: "neutral",
};

const SCENE_TYPES = [
  "HOOK", "BRAND_INTRO", "LEARNING_OBJECTIVE", "CONCEPT", "DEFINITION", "EXAMPLE", "WORKED_EXAMPLE",
  "EQUATION", "DIAGRAM", "ANIMATION", "COMPARISON", "EXAM_TIP", "WAEC_QUESTION", "MULTIPLE_CHOICE",
  "QUESTION_TIMER", "ANSWER_REVEAL", "SUMMARY", "CALL_TO_ACTION", "OUTRO",
];

function formatDuration(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ProjectEditor({
  project,
  canCreate,
  canReview,
  aiConfigured,
  voiceConfigured,
  renderWorkerConfigured,
}: {
  project: FullProject;
  canCreate: boolean;
  canReview: boolean;
  aiConfigured: boolean;
  voiceConfigured: boolean;
  renderWorkerConfigured: boolean;
}) {
  const [tab, setTab] = useState<"scenes" | "script" | "questions" | "settings">("scenes");
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(project.scenes[0]?.id ?? null);
  const [isPending, startTransition] = useTransition();
  const [genError, setGenError] = useState<string | null>(null);
  const [regenInstructions, setRegenInstructions] = useState("");
  const [questionSearch, setQuestionSearch] = useState<{ id: string; prompt: string; correctOption: string }[]>([]);
  const [questionQuery, setQuestionQuery] = useState("");

  const selectedScene = project.scenes.find((s) => s.id === selectedSceneId) ?? null;
  const totalDuration = project.scenes.reduce((sum, s) => sum + s.estimatedDurationSec, 0);
  const examLabel = `${project.countryExam.exam.name} (${project.countryExam.exam.examBody.name})`;
  const narrationScenes = project.scenes.filter((s) => s.narration && s.narration.trim());
  const voicesReady = narrationScenes.filter((s) => s.voiceStatus === "READY").length;
  const latestRenderJob = project.renderJobs[0] ?? null;
  const canQueueRender =
    ["SCRIPT_APPROVED", "ASSETS_GENERATING", "VOICE_GENERATING", "READY_TO_RENDER", "RENDER_FAILED"].includes(
      project.status
    ) && (!latestRenderJob || latestRenderJob.status === "FAILED" || latestRenderJob.status === "CANCELLED");

  function handleGenerateAllVoices() {
    setGenError(null);
    startTransition(async () => {
      const result = await generateAllVoicesAction(project.id);
      if (!result.ok) setGenError(result.error);
    });
  }

  function handleGenerate() {
    setGenError(null);
    startTransition(async () => {
      const result = await generateScriptAction(project.id);
      if (!result.ok) setGenError(result.error);
    });
  }

  async function runQuestionSearch(subjectId: string, query: string) {
    setQuestionQuery(query);
    const results = await searchQuestionsAction(subjectId, query);
    setQuestionSearch(results);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-h2 font-semibold text-text-primary">{project.title}</h1>
            <Badge tone={STATUS_TONE[project.status] ?? "neutral"}>{project.status.replaceAll("_", " ")}</Badge>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            {examLabel} · {project.countryExam.country.flag} {project.countryExam.country.name} · {project.subject.name} ·{" "}
            {project.topic}
            {project.gradeLevel ? ` · ${project.gradeLevel}` : ""}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {project.videoType.replaceAll("_", " ")} · Target {formatDuration(project.targetDurationSec)} · Scenes total{" "}
            {formatDuration(totalDuration)} · {project.aspectRatio.replace("_", " ")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canCreate && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isPending || !aiConfigured}
              title={aiConfigured ? undefined : "AI generation is not configured — set ANTHROPIC_API_KEY"}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
            >
              {isPending ? "Generating…" : project.scenes.length > 0 ? "Regenerate Script" : "Generate Script"}
            </button>
          )}
          {canCreate && project.status !== "NEEDS_REVIEW" && project.status !== "SCRIPT_APPROVED" && (
            <button
              type="button"
              disabled={project.scenes.length === 0}
              onClick={() => startTransition(() => submitForReviewAction(project.id))}
              className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted disabled:opacity-50"
            >
              Submit for Review
            </button>
          )}
          {canReview && project.status === "NEEDS_REVIEW" && (
            <button
              type="button"
              onClick={() => startTransition(() => approveScriptAction(project.id))}
              className="rounded-lg border border-success/40 px-4 py-2 text-sm text-success hover:border-success"
            >
              Approve Script
            </button>
          )}
          {canCreate && narrationScenes.length > 0 && (
            <button
              type="button"
              onClick={handleGenerateAllVoices}
              disabled={isPending || !voiceConfigured}
              title={
                voiceConfigured
                  ? undefined
                  : "Set OPENAI_API_KEY and enable Vercel Blob (BLOB_READ_WRITE_TOKEN) to generate voice"
              }
              className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted disabled:opacity-50"
            >
              {project.status === "VOICE_GENERATING"
                ? "Generating voices…"
                : `Generate All Voices (${voicesReady}/${narrationScenes.length})`}
            </button>
          )}
          {canCreate && latestRenderJob && (latestRenderJob.status === "QUEUED" || latestRenderJob.status === "RENDERING") && (
            <div className="flex items-center gap-2 rounded-lg border border-border-strong px-3 py-2 text-sm">
              <Badge tone={RENDER_STATUS_TONE[latestRenderJob.status]}>
                {latestRenderJob.status === "RENDERING" ? `Rendering ${latestRenderJob.progressPercent}%` : "Queued"}
              </Badge>
              {latestRenderJob.status === "QUEUED" && (
                <button
                  type="button"
                  onClick={() => startTransition(() => cancelRenderJobAction(latestRenderJob.id))}
                  className="text-xs text-danger hover:underline"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
          {canCreate && latestRenderJob?.status === "COMPLETE" && latestRenderJob.outputUrl && (
            <a
              href={latestRenderJob.outputUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-success/40 px-4 py-2 text-sm text-success hover:border-success"
            >
              View rendered video
            </a>
          )}
          {canCreate && latestRenderJob?.status === "FAILED" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-danger">{latestRenderJob.errorMessage ?? "Render failed."}</span>
              <button
                type="button"
                onClick={() => startTransition(() => retryRenderJobAction(latestRenderJob.id))}
                className="rounded-lg border border-border-strong px-3 py-2 text-xs text-text-secondary hover:border-text-muted"
              >
                Retry
              </button>
            </div>
          )}
          {canCreate && canQueueRender && (
            <button
              type="button"
              disabled={isPending || !renderWorkerConfigured}
              title={renderWorkerConfigured ? undefined : "No render worker is connected yet"}
              onClick={() =>
                startTransition(async () => {
                  const result = await queueRenderJobAction(project.id);
                  if (!result.ok) setGenError(result.error);
                })
              }
              className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted disabled:opacity-50"
            >
              Render
            </button>
          )}
          <button
            type="button"
            disabled
            title="Available in a later phase — YouTube publishing isn't built yet"
            className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-muted opacity-50"
          >
            Publish
          </button>
        </div>
      </div>

      {genError && (
        <p className="mt-3 rounded-lg border border-danger/40 bg-danger-surface px-3 py-2 text-sm text-danger">{genError}</p>
      )}

      <div className="mt-4 flex gap-1 border-b border-border text-sm">
        {(["scenes", "script", "questions", "settings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 capitalize ${
              tab === t ? "border-brand text-text-primary" : "border-transparent text-text-muted hover:text-text-secondary"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {project.scenes.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-border-strong p-8 text-center text-sm text-text-secondary">
          No scenes yet.{" "}
          {aiConfigured ? "Generate a script to get started." : "AI generation is not configured — set ANTHROPIC_API_KEY, or add scenes manually via the database while that's pending."}
        </p>
      )}

      {tab === "scenes" && project.scenes.length > 0 && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="space-y-1.5">
            {project.scenes.map((scene) => (
              <div key={scene.id}>
                <button
                  onClick={() => setSelectedSceneId(scene.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${
                    scene.id === selectedSceneId ? "border-brand bg-brand/10" : "border-border hover:border-border-strong"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-text-muted">{formatDuration(scene.estimatedDurationSec)}</span>
                    <Badge tone={scene.reviewStatus === "APPROVED" ? "success" : scene.reviewStatus === "FLAGGED" ? "danger" : "neutral"}>
                      {scene.sceneType.replaceAll("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate font-medium text-text-primary">{scene.title}</p>
                </button>
                {canCreate && (
                  <div className="mt-0.5 flex gap-1 px-1 text-[10px] text-text-muted">
                    <button onClick={() => startTransition(() => reorderSceneAction(scene.id, "up"))} className="hover:text-text-primary">
                      ↑
                    </button>
                    <button onClick={() => startTransition(() => reorderSceneAction(scene.id, "down"))} className="hover:text-text-primary">
                      ↓
                    </button>
                    <button onClick={() => startTransition(() => duplicateSceneAction(scene.id))} className="hover:text-text-primary">
                      Duplicate
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete this scene?")) startTransition(() => deleteSceneAction(scene.id));
                      }}
                      className="hover:text-danger"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {selectedScene && (
            <div className="rounded-xl border border-border bg-surface-raised p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wide text-text-muted">
                  Scene {project.scenes.findIndex((s) => s.id === selectedScene.id) + 1} of {project.scenes.length}
                </p>
                {canCreate && (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Instructions for regeneration (optional)"
                      value={regenInstructions}
                      onChange={(e) => setRegenInstructions(e.target.value)}
                      className="w-64 text-xs"
                    />
                    <button
                      type="button"
                      disabled={isPending || !aiConfigured}
                      onClick={() =>
                        startTransition(async () => {
                          const result = await regenerateSceneAction(selectedScene.id, regenInstructions || undefined);
                          if (!result.ok) setGenError(result.error);
                        })
                      }
                      className="shrink-0 rounded-lg border border-brand/40 px-3 py-1.5 text-xs text-brand-text hover:border-brand disabled:opacity-50"
                    >
                      Regenerate narration
                    </button>
                  </div>
                )}
              </div>

              <form
                key={selectedScene.id}
                action={(fd) =>
                  startTransition(() => {
                    updateSceneAction(fd);
                  })
                }
                className="mt-3 space-y-3"
              >
                <input type="hidden" name="sceneId" value={selectedScene.id} />

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="sceneType">Scene type</Label>
                    <select
                      id="sceneType"
                      name="sceneType"
                      defaultValue={selectedScene.sceneType}
                      disabled={!canCreate}
                      className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand disabled:opacity-60"
                    >
                      {SCENE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" name="title" defaultValue={selectedScene.title} disabled={!canCreate} />
                  </div>
                </div>

                <div>
                  <Label htmlFor="estimatedDurationSec">Duration (seconds)</Label>
                  <Input
                    id="estimatedDurationSec"
                    name="estimatedDurationSec"
                    type="number"
                    min={1}
                    defaultValue={selectedScene.estimatedDurationSec}
                    disabled={!canCreate}
                    className="w-32"
                  />
                </div>

                <div>
                  <Label htmlFor="narration">Narration</Label>
                  <Textarea id="narration" name="narration" defaultValue={selectedScene.narration ?? ""} rows={4} disabled={!canCreate} />
                </div>

                <div className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-text-secondary">Voice</span>
                    <Badge tone={VOICE_STATUS_TONE[selectedScene.voiceStatus]}>{selectedScene.voiceStatus.replaceAll("_", " ")}</Badge>
                  </div>
                  {selectedScene.voiceStatus === "READY" && selectedScene.voiceAudioUrl && (
                    <div className="mt-2 space-y-1">
                      <audio controls src={selectedScene.voiceAudioUrl} className="w-full" />
                      <p className="text-xs text-text-muted">
                        {selectedScene.voiceProvider} · {selectedScene.voiceId} · ~{Math.round(selectedScene.voiceDurationSec ?? 0)}s (estimated)
                      </p>
                    </div>
                  )}
                  {selectedScene.voiceStatus === "FAILED" && selectedScene.voiceError && (
                    <p className="mt-2 text-xs text-danger">{selectedScene.voiceError}</p>
                  )}
                  {canCreate && (
                    <button
                      type="button"
                      disabled={isPending || !voiceConfigured || !selectedScene.narration?.trim()}
                      title={
                        !voiceConfigured
                          ? "Set OPENAI_API_KEY and enable Vercel Blob (BLOB_READ_WRITE_TOKEN) to generate voice"
                          : !selectedScene.narration?.trim()
                            ? "This scene has no narration text"
                            : undefined
                      }
                      onClick={() =>
                        startTransition(async () => {
                          const result = await generateSceneVoiceAction(selectedScene.id);
                          if (!result.ok) setGenError(result.error);
                        })
                      }
                      className="mt-2 rounded-lg border border-brand/40 px-3 py-1.5 text-xs text-brand-text hover:border-brand disabled:opacity-50"
                    >
                      {selectedScene.voiceStatus === "READY" ? "Regenerate voice" : "Generate voice"}
                    </button>
                  )}
                </div>

                <div>
                  <Label htmlFor="onScreenText">On-screen text</Label>
                  <Textarea id="onScreenText" name="onScreenText" defaultValue={selectedScene.onScreenText ?? ""} rows={2} disabled={!canCreate} />
                </div>
                <div>
                  <Label htmlFor="visualDirection">Visual direction</Label>
                  <Textarea id="visualDirection" name="visualDirection" defaultValue={selectedScene.visualDirection ?? ""} rows={2} disabled={!canCreate} />
                </div>
                <div>
                  <Label htmlFor="animationInstructions">Animation instructions</Label>
                  <Textarea id="animationInstructions" name="animationInstructions" defaultValue={selectedScene.animationInstructions ?? ""} rows={2} disabled={!canCreate} />
                </div>
                <div>
                  <Label htmlFor="learningObjective">Learning objective</Label>
                  <Input id="learningObjective" name="learningObjective" defaultValue={selectedScene.learningObjective ?? ""} disabled={!canCreate} />
                </div>
                <div>
                  <Label htmlFor="equation">Equation (LaTeX)</Label>
                  <Input id="equation" name="equation" defaultValue={selectedScene.equation ?? ""} disabled={!canCreate} />
                  {selectedScene.equation && (
                    <div className="mt-2 rounded-lg border border-border bg-surface px-3 py-2">
                      <EquationDisplay equation={selectedScene.equation} />
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="diagramDescription">Diagram description</Label>
                  <Textarea id="diagramDescription" name="diagramDescription" defaultValue={selectedScene.diagramDescription ?? ""} rows={2} disabled={!canCreate} />
                </div>

                {canCreate && (
                  <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover">
                    Save scene
                  </button>
                )}
              </form>

              {(selectedScene.sceneType === "WAEC_QUESTION" || selectedScene.sceneType === "MULTIPLE_CHOICE") && (
                <div className="mt-6 border-t border-border pt-4">
                  <p className="text-sm font-medium text-text-secondary">Question</p>
                  {selectedScene.questionSource === "EXISTING_QUESTION" && selectedScene.question && (
                    <div className="mt-2 rounded-lg border border-success/30 bg-success-surface p-3 text-sm">
                      <Badge tone="success">From question bank</Badge>
                      <p className="mt-2 text-text-primary">{selectedScene.question.prompt}</p>
                      <p className="mt-1 text-xs text-text-muted">Answer: {selectedScene.question.correctOption}</p>
                      {canCreate && (
                        <button onClick={() => startTransition(() => clearSceneQuestionAction(selectedScene.id))} className="mt-2 text-xs text-danger hover:underline">
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                  {selectedScene.questionSource === "AI_DRAFT" && (
                    <div className="mt-2 rounded-lg border border-warning/30 bg-warning-surface p-3 text-sm">
                      <Badge tone="warning">AI draft — not in question bank</Badge>
                      <p className="mt-2 text-text-primary">{selectedScene.draftQuestionPrompt}</p>
                      {Array.isArray(selectedScene.draftQuestionOptions) &&
                        (selectedScene.draftQuestionOptions as { key: string; text: string }[]).map((o) => (
                          <p key={o.key} className="text-xs text-text-secondary">
                            {o.key}. {o.text}
                          </p>
                        ))}
                      <p className="mt-1 text-xs text-text-muted">Answer: {selectedScene.draftQuestionAnswer}</p>
                      {selectedScene.draftQuestionExplanation && (
                        <p className="mt-1 text-xs text-text-muted">Explanation: {selectedScene.draftQuestionExplanation}</p>
                      )}
                      {canCreate && (
                        <button onClick={() => startTransition(() => clearSceneQuestionAction(selectedScene.id))} className="mt-2 text-xs text-danger hover:underline">
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                  {selectedScene.questionSource === "NONE" && canCreate && (
                    <div className="mt-2 space-y-2">
                      <Input
                        placeholder={`Search ${project.subject.name} questions…`}
                        value={questionQuery}
                        onChange={(e) => runQuestionSearch(project.subjectId, e.target.value)}
                      />
                      {questionSearch.length > 0 && (
                        <ul className="max-h-40 space-y-1 overflow-y-auto">
                          {questionSearch.map((q) => (
                            <li key={q.id}>
                              <button
                                onClick={() => startTransition(() => assignExistingQuestionAction(selectedScene.id, q.id))}
                                className="w-full rounded-lg border border-border px-2 py-1 text-left text-xs hover:border-brand"
                              >
                                {q.prompt}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "script" && (
        <div className="mt-4 space-y-4">
          {project.scenes.map((scene) => (
            <div key={scene.id} className="rounded-lg border border-border p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                {scene.sceneType.replaceAll("_", " ")} · {formatDuration(scene.estimatedDurationSec)}
              </p>
              <p className="mt-1 text-sm text-text-primary">{scene.narration ?? <span className="text-text-muted">(no narration)</span>}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "questions" && (
        <div className="mt-4 space-y-3">
          {project.scenes.filter((s) => s.questionSource !== "NONE").length === 0 && (
            <p className="text-sm text-text-muted">No question scenes yet.</p>
          )}
          {project.scenes
            .filter((s) => s.questionSource !== "NONE")
            .map((scene) => (
              <div key={scene.id} className="rounded-lg border border-border p-3 text-sm">
                <Badge tone={scene.questionSource === "EXISTING_QUESTION" ? "success" : "warning"}>
                  {scene.questionSource === "EXISTING_QUESTION" ? "From question bank" : "AI draft"}
                </Badge>
                <p className="mt-2 text-text-primary">{scene.question?.prompt ?? scene.draftQuestionPrompt}</p>
              </div>
            ))}
        </div>
      )}

      {tab === "settings" && (
        <form
          action={(fd) =>
            startTransition(() => {
              updateProjectMetaAction(fd);
            })
          }
          className="mt-4 max-w-lg space-y-4"
        >
          <input type="hidden" name="projectId" value={project.id} />
          <div>
            <Label htmlFor="descTitle">Title</Label>
            <Input id="descTitle" name="title" defaultValue={project.title} disabled={!canCreate} />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" defaultValue={project.description ?? ""} rows={3} disabled={!canCreate} />
          </div>
          <div>
            <Label htmlFor="ctaLabel">CTA label</Label>
            <Input id="ctaLabel" name="ctaLabel" defaultValue={project.ctaLabel ?? "Take the Quiz"} disabled={!canCreate} />
          </div>
          <div>
            <Label htmlFor="ctaDestination">CTA destination</Label>
            <Input id="ctaDestination" name="ctaDestination" defaultValue={project.ctaDestination ?? ""} placeholder="/practice/waec" disabled={!canCreate} />
          </div>
          <div>
            <Label htmlFor="campaignId">Campaign identifier</Label>
            <Input id="campaignId" name="campaignId" defaultValue={project.campaignId ?? ""} disabled={!canCreate} />
          </div>
          {canCreate && (
            <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover">
              Save settings
            </button>
          )}

          <div className="border-t border-border pt-4 text-xs text-text-muted">
            <p>Subtitles, Assets, Thumbnail, and YouTube tabs aren&apos;t available yet — those arrive in later phases.</p>
            <p className="mt-1">Created by {project.createdBy.name}.</p>
          </div>
        </form>
      )}
    </div>
  );
}
