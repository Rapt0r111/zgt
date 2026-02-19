import { type NextRequest, NextResponse } from "next/server";

const GUEST_ONLY = ["/login", "/register"];

const PROTECTED  = [
  "/dashboard",
  "/personnel",
  "/equipment",
  "/phones",
  "/storage-and-passes",
  "/users",
  "/acts",
];

// ↓ было "middleware", стало "proxy"
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthenticated = Boolean(
    request.cookies.get("access_token")?.value,
  );

  // 1. Авторизованный → /login : редирект на /dashboard
  if (isAuthenticated && GUEST_ONLY.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 2. Гость → защищённая страница : редирект на /login
  if (!isAuthenticated && PROTECTED.some((r) => pathname.startsWith(r))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/personnel/:path*",
    "/equipment/:path*",
    "/phones/:path*",
    "/storage-and-passes/:path*",
    "/users/:path*",
    "/acts/:path*",
    "/login",
    "/register",
  ],
};