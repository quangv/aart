import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// UUID v4 pattern — matches /dashboard/<uuid> exactly
const CHILD_ROUTE =
  /^\/dashboard\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export function proxy(request: NextRequest) {
  const match = request.nextUrl.pathname.match(CHILD_ROUTE);
  if (match) {
    const response = NextResponse.next();
    response.cookies.set("last_child_id", match[1], {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: true,
      sameSite: "lax",
    });
    return response;
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/dashboard/:path*",
};
