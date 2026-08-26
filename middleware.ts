import { NextResponse, type NextRequest } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const ORIGIN_EXEMPT_PATHS = new Set(["/api/stripe/webhook"]);

function normalizedOrigin(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  if (SAFE_METHODS.has(request.method) || ORIGIN_EXEMPT_PATHS.has(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const configuredOrigin = normalizedOrigin(process.env.NEXT_PUBLIC_APP_URL ?? null);
  const origin = normalizedOrigin(request.headers.get("origin"));
  const allowedOrigin = configuredOrigin ?? request.nextUrl.origin;

  if (!origin || origin !== allowedOrigin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*"
};
