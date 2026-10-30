import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Sends visitors with no session to sign in before the plans screens load. It only checks that the cookie exists:
 * the API is the real authority, and a stale cookie is caught by its 401.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has("fb_session")) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/plans/:path*"] };
