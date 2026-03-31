import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware that proxies /api/v1/* requests to the backend API.
 * This allows the frontend to work without NEXT_PUBLIC_API_URL at build time —
 * the browser makes relative requests, and this middleware forwards them.
 */
export function middleware(request: NextRequest) {
  const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    return NextResponse.next();
  }

  const target = new URL(
    request.nextUrl.pathname + request.nextUrl.search,
    apiUrl,
  );

  return NextResponse.rewrite(target);
}

export const config = {
  matcher: "/api/:path*",
};
