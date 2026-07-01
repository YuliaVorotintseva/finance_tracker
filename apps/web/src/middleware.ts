import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { auth } from "@/lib/auth";

const ratelimit = process.env.UPSTASH_REDIS_REST_URL
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(100, "60 s"),
      analytics: true,
      prefix: "ratelimit:web",
    })
  : null;

const authRatelimit = process.env.UPSTASH_REDIS_REST_URL
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      prefix: "ratelimit:auth",
    })
  : null;

export default auth(async (req) => {
  const isAuth = !!req.auth;
  const pathname = req.nextUrl.pathname;
  const ip = req.headers.get("x-forwarded-for") || "unknown";

  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isAPIRoute = pathname.startsWith("/api");
  const isStaticFile =
    pathname.startsWith("/_next") || pathname.startsWith("/favicon");

  if (isStaticFile || isAPIRoute) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/auth") && authRatelimit) {
    const { success, reset } = await authRatelimit.limit(ip);
    if (!success) {
      return new NextResponse(
        JSON.stringify({
          error: "Too many requests",
          retryAfter: Math.ceil((reset - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
          },
        },
      );
    }
  }

  if (ratelimit) {
    const identifier = req.auth?.user?.id || ip;
    const { success } = await ratelimit.limit(identifier);
    if (!success) {
      return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
      });
    }
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
