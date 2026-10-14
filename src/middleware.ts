import { NextResponse, type NextRequest } from "next/server";
import {
  PENDING_COOKIE,
  SESSION_COOKIE,
  readSessionPlayerIdFromCookie,
} from "@/lib/auth/session-seal";

function isProtected(pathname: string): boolean {
  return (
    pathname.startsWith("/account") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/treasurer") ||
    pathname.startsWith("/pay")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const playerId = await readSessionPlayerIdFromCookie(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (isProtected(pathname) && !playerId) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if ((pathname === "/" || pathname === "/verify") && playerId) {
    const url = request.nextUrl.clone();
    url.pathname = "/account";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (pathname === "/verify" && !request.cookies.get(PENDING_COOKIE)?.value) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/verify", "/account/:path*", "/admin/:path*", "/treasurer/:path*", "/pay/:path*"],
};
