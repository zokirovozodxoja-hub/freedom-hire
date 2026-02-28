import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Маршруты, требующие авторизации
const PRIVATE_PREFIXES = [
  "/me",
  "/resume",
  "/profile",
  "/onboarding",
  "/employer",
  "/admin",
];

// Email-адреса администраторов (синхронизируй с AdminLayout)
const ADMIN_EMAILS = ["zokirovozodxoja@gmail.com"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Пропускаем статику, API, файлы, auth
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
        get(name) {
          return req.cookies.get(name)?.value;
        },
        set(name, value, options) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          res.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();

  // Не авторизован — редирект на авторизацию с сохранением next
  if (!data.user) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const userEmail = data.user.email ?? "";
  const isAdmin = ADMIN_EMAILS.includes(userEmail);

  // Попытка зайти в /admin без прав — редирект на главную
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