import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/admin/audit";
import { requireActionPermission } from "@/lib/admin/authz";
import { exchangeCodeForTokens } from "@/lib/youtube/oauth";
import { getChannelInfo } from "@/lib/youtube/client";
import { encryptToken } from "@/lib/youtube/crypto";
import { STATE_COOKIE } from "@/app/api/youtube/oauth/connect/route";

const SETTINGS_PATH = "/dashboard/admin/video-studio/settings";

export async function GET(request: NextRequest) {
  const session = await requireActionPermission("video_studio.create");
  const url = request.nextUrl;

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL(`${SETTINGS_PATH}?youtube=error`, url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      throw new Error("Google did not return a refresh token — the account may have already granted consent without offline access.");
    }
    const channel = await getChannelInfo(tokens.access_token);

    await prisma.$transaction([
      prisma.youTubeConnection.deleteMany({}),
      prisma.youTubeConnection.create({
        data: {
          channelId: channel.id,
          channelTitle: channel.title,
          channelThumbnailUrl: channel.thumbnailUrl,
          refreshTokenEncrypted: encryptToken(tokens.refresh_token),
          scope: tokens.scope,
          connectedById: session.user.id,
        },
      }),
    ]);

    await logAudit({
      actorUserId: session.user.id,
      actorRole: session.user.role,
      action: "YOUTUBE_CHANNEL_CONNECTED",
      resourceType: "YouTubeConnection",
      resourceId: channel.id,
      result: "SUCCESS",
      after: { channelId: channel.id, channelTitle: channel.title },
    });

    return NextResponse.redirect(new URL(`${SETTINGS_PATH}?youtube=connected`, url));
  } catch (err) {
    await logAudit({
      actorUserId: session.user.id,
      actorRole: session.user.role,
      action: "YOUTUBE_CHANNEL_CONNECT_FAILED",
      resourceType: "YouTubeConnection",
      result: "FAILURE",
      after: { error: err instanceof Error ? err.message : String(err) },
    });
    return NextResponse.redirect(new URL(`${SETTINGS_PATH}?youtube=error`, url));
  }
}
