import { type NextRequest, NextResponse } from "next/server";

const GUEST_ONLY_ROUTES = ["/login", "/register"];

const PROTECTED_ROUTES = [
  "/dashboard",
  "/personnel",
  "/equipment",
  "/phones",
  "/storage-and-passes",
  "/users",
];

// ↓ было "middleware", стало "proxy"
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get("access_token")?.value;
  const isAuthenticated = Boolean(accessToken);

  // 1. Авторизованный → /login : редирект на /dashboard
  if (isAuthenticated && GUEST_ONLY_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 2. Гость → защищённая страница : редирект на /login
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  if (!isAuthenticated && isProtected) {
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
    "/login",
    "/register",
  ],
};