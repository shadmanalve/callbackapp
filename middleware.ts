import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const cookieName = process.env.VIEWER_COOKIE_NAME || "wv_auth";
  const authed = req.cookies.get(cookieName)?.value === "1";

  const isProtected = req.nextUrl.pathname.startsWith("/events");
  const isLogin = req.nextUrl.pathname.startsWith("/login");

  if (isProtected && !authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isLogin && authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/events";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/events/:path*", "/login"],
};
