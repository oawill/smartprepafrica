import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/admin/audit";
import type { RenderJobStatus } from "@prisma/client";

/** Progress-reporting endpoint for a render worker — deliberately
 * independent of this app's database credentials, so the worker can live
 * anywhere (Lambda, a separate container) without needing DATABASE_URL.
 * Authenticated with a shared secret rather than an HMAC signature scheme
 * (unlike src/app/api/webhooks/paystack/route.ts) since we control both
 * ends of this one — there's no external provider's signature to match. */
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.RENDER_WORKER_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  const expected = Buffer.from(secret);
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

const bodySchema = {
  parse(data: unknown) {
    if (typeof data !== "object" || data === null) throw new Error("Invalid body");
    const d = data as Record<string, unknown>;
    const status = d.status;
    if (status !== "RENDERING" && status !== "COMPLETE" && status !== "FAILED") {
      throw new Error("status must be RENDERING, COMPLETE, or FAILED");
    }
    return {
      status,
      progressPercent: typeof d.progressPercent === "number" ? d.progressPercent : undefined,
      outputUrl: typeof d.outputUrl === "string" ? d.outputUrl : undefined,
      outputDurationSec: typeof d.outputDurationSec === "number" ? d.outputDurationSec : undefined,
      errorMessage: typeof d.errorMessage === "string" ? d.errorMessage : undefined,
    };
  },
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const job = await prisma.videoRenderJob.findUnique({ where: { id } });
  if (!job) {
    return NextResponse.json({ error: "Render job not found" }, { status: 404 });
  }

  let body: ReturnType<typeof bodySchema.parse>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid body" }, { status: 400 });
  }

  const isFirstProgressUpdate = job.status === "QUEUED" && body.status === "RENDERING";

  await prisma.videoRenderJob.update({
    where: { id },
    data: {
      status: body.status as RenderJobStatus,
      progressPercent: body.progressPercent ?? job.progressPercent,
      outputUrl: body.outputUrl ?? job.outputUrl,
      outputDurationSec: body.outputDurationSec ?? job.outputDurationSec,
      errorMessage: body.status === "FAILED" ? (body.errorMessage ?? "Render failed.") : null,
      startedAt: isFirstProgressUpdate ? new Date() : job.startedAt,
      completedAt: body.status === "COMPLETE" || body.status === "FAILED" ? new Date() : job.completedAt,
    },
  });

  const projectStatus =
    body.status === "RENDERING" ? "RENDERING" : body.status === "COMPLETE" ? "RENDER_COMPLETE" : "RENDER_FAILED";
  await prisma.videoProject.update({ where: { id: job.projectId }, data: { status: projectStatus } });

  await logAudit({
    action: `VIDEO_RENDER_JOB_${body.status}`,
    resourceType: "VideoRenderJob",
    resourceId: id,
    result: "SUCCESS",
    after: { status: body.status, progressPercent: body.progressPercent },
  });

  return NextResponse.json({ ok: true });
}
