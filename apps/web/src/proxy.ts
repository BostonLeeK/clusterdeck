import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

const publicPaths = ["/sign-in", "/sign-up", "/verify-email", "/forgot-password", "/reset-password", "/p"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/api/auth") ||
    publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  ) {
    return NextResponse.next();
  }

  const session = await auth();
  if (!session?.user && (pathname.startsWith("/projects") || pathname.startsWith("/editor") || pathname === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
