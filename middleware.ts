import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PRIVATE_PREFIXES = [
  "/me",
  "/resume",
  "/profile",
  "/onboarding",
  "/employer",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // пропускаем next/static, api, файлы
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const isPrivate = PRIVATE_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isPrivate) return NextResponse.next();

  // простой способ: проверяем наличие supabase токена в cookies
  // (в реальном проекте можно сделать более строго)
  const hasSession =
    req.cookies.get("sb-access-token") ||
    req.cookies.get("sb:token") ||
    req.cookies.get("supabase-auth-token");

  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("role", "candidate");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};