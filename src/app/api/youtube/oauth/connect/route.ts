import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireActionPermission } from "@/lib/admin/authz";
import { isYouTubeConfigured } from "@/lib/youtube/config";
import { buildAuthUrl } from "@/lib/youtube/oauth";

export const STATE_COOKIE = "yt_oauth_state";

export async function GET(request: NextRequest) {
  await requireActionPermission("video_studio.create");

  if (!isYouTubeConfigured()) {
    return NextResponse.redirect(new URL("/dashboard/admin/video-studio/settings?youtube=error", request.url));
  }

  const state = crypto.randomBytes(24).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.redirect(buildAuthUrl(state));
}
