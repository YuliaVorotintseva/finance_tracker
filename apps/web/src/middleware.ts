import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

export default auth((req) => {
  const isAuth = !!req.auth;
  const pathname = req.nextUrl.pathname;

  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isAPIRoute = pathname.startsWith("/api");
  const isStaticFile =
    pathname.startsWith("/_next") || pathname.startsWith("/favicon");

  if (isStaticFile || isAPIRoute) {
    return NextResponse.next();
  }

  if (isAuthPage) {
    if (isAuth) return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.next();
  }

  if (!isAuth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
