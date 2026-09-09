import { auth } from "@/lib/auth";

/** Maps an old /educom/* path to its /learn/* equivalent, or null if the
 * path isn't under /educom at all. Pure and exported for direct unit
 * testing — the query string is handled separately by the caller (a
 * plain URL rebuild preserves it automatically, no per-param logic
 * needed here). */
export function rewriteEducomPath(pathname: string): string | null {
  if (pathname !== "/educom" && !pathname.startsWith("/educom/")) return null;
  return pathname.replace(/^\/educom/, "/learn");
}

export default auth((req) => {
  const newPath = rewriteEducomPath(req.nextUrl.pathname);
  if (newPath) {
    const url = new URL(newPath + req.nextUrl.search, req.nextUrl.origin);
    return Response.redirect(url, 301);
  }

  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/practice/:exam",
    "/practice/session/:path*",
    "/practice/results/:path*",
    "/practice/history",
    "/learn/:courseId/lessons/:path*",
    "/educom/:path*",
  ],
};
