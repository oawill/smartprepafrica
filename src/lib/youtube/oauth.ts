import { youtubeRedirectUri } from "@/lib/youtube/config";

const SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"].join(" ");

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: youtubeRedirectUri(),
    response_type: "code",
    access_type: "offline",
    // Forces Google to reissue a refresh token even for a previously
    // authorized user — needed since reconnecting must always yield one.
    prompt: "consent",
    scope: SCOPES,
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

type TokenResponse = { access_token: string; refresh_token?: string; scope: string; expires_in: number };

async function tokenRequest(body: URLSearchParams): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token endpoint returned ${res.status}: ${text}`);
  }
  return res.json() as Promise<TokenResponse>;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  return tokenRequest(
    new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: youtubeRedirectUri(),
      grant_type: "authorization_code",
    }),
  );
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const result = await tokenRequest(
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
    }),
  );
  return result.access_token;
}
