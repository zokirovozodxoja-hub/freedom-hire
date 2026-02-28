import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PRIVATE_PREFIXES = ["/me", "/resume", "/profile", "/onboarding", "/employer", "/admin"];
const ADMIN_EMAILS = ["zokirovozodxoja@gmail.com"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname.startsWith("/auth")
  ) {
    return NextResponse.next();
  }

  const isPrivate = PRIVATE_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isPrivate) return NextResponse.next();

  let res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return req.cookies.get(name)?.value; },
        set(name, value, options) { res.cookies.set({ name, value, ...options }); },
        remove(name, options) { res.cookies.set({ name, value: "", ...options, maxAge: 0 }); },
      },
    }
  );

  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const userEmail = data.user.email ?? "";
  const isAdmin = ADMIN_EMAILS.includes(userEmail);

  // Блокировка пользователя
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_blocked")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.is_blocked) {
    await supabase.auth.signOut();
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("error", "blocked");
    return NextResponse.redirect(url);
  }

  // Только admin может зайти в /admin
  if (pathname.startsWith("/admin") && !isAdmin) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
