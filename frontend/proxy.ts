import { type NextRequest, NextResponse } from "next/server";

const GUEST_ONLY = ["/login", "/register"];
const PROTECTED = ["/dashboard", "/personnel", "/equipment", "/phones", "/storage-and-passes", "/users", "/acts"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = Boolean(request.cookies.get("access_token")?.value);

  if (isAuthenticated && GUEST_ONLY.some((r) => pathname.startsWith(r))) {
    const res = NextResponse.redirect(new URL("/dashboard", request.url));
    res.cookies.set("auth_redirect_notice", "1", { maxAge: 5, path: "/" });
    return res;
  }

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