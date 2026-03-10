import { NextRequest, NextResponse } from "next/server";

// Routes that require authentication — redirect to /login if no access cookie
const PROTECTED_PREFIXES = ["/publish", "/settings", "/notifications"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected) {
    // The API sets an httpOnly access cookie — check for its presence
    const accessCookie =
      req.cookies.get("scriptify_access")?.value;

    if (!accessCookie) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("return", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/publish/:path*", "/settings/:path*", "/notifications/:path*"],
};
