import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/youtube/crypto";
import { refreshAccessToken } from "@/lib/youtube/oauth";

export type ChannelInfo = { id: string; title: string; thumbnailUrl: string | null };

export async function getChannelInfo(accessToken: string): Promise<ChannelInfo> {
  const res = await fetch("https://www.googleapis.com/youtube/v3/channels?mine=true&part=snippet", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`YouTube channels.list returned ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { items?: { id: string; snippet: { title: string; thumbnails?: { default?: { url: string } } } }[] };
  const channel = data.items?.[0];
  if (!channel) throw new Error("Google account has no YouTube channel.");
  return { id: channel.id, title: channel.snippet.title, thumbnailUrl: channel.snippet.thumbnails?.default?.url ?? null };
}

/** Loads the singleton connection and exchanges its stored refresh token for
 * a fresh access token. Access tokens are never cached — uploads are
 * infrequent enough that the extra round trip is negligible, and this
 * avoids tracking expiry. */
export async function getValidAccessToken(): Promise<string> {
  const connection = await prisma.youTubeConnection.findFirst();
  if (!connection) throw new Error("No YouTube channel is connected.");
  const refreshToken = decryptToken(connection.refreshTokenEncrypted);
  return refreshAccessToken(refreshToken);
}

type UploadVideoParams = {
  accessToken: string;
  stream: ReadableStream<Uint8Array>;
  sizeBytes: number;
  title: string;
  description: string;
  privacyStatus: "private" | "unlisted";
};

/** YouTube's resumable upload protocol: initiate a session (get a one-time
 * upload URL back in the Location header), then PUT the video bytes to it.
 * Streams straight through — never buffers the whole file in memory. */
export async function uploadVideo({ accessToken, stream, sizeBytes, title, description, privacyStatus }: UploadVideoParams): Promise<string> {
  const initRes = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": "video/mp4",
      "X-Upload-Content-Length": String(sizeBytes),
    },
    body: JSON.stringify({
      snippet: { title, description },
      status: { privacyStatus },
    }),
  });
  if (!initRes.ok) throw new Error(`YouTube upload session init returned ${initRes.status}: ${await initRes.text()}`);
  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) throw new Error("YouTube did not return a resumable upload URL.");

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Length": String(sizeBytes), "Content-Type": "video/mp4" },
    body: stream,
    // @ts-expect-error -- required by undici when streaming a body with a duplex request
    duplex: "half",
  });
  if (!putRes.ok) throw new Error(`YouTube upload returned ${putRes.status}: ${await putRes.text()}`);
  const uploaded = (await putRes.json()) as { id: string };
  return uploaded.id;
}
