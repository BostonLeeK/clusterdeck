import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/urls";

const publicPaths = [
  "/sign-in",
  "/sign-up",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/p",
  "/invite",
  "/docs",
  "/support",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/resend") ||
    publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  ) {
    const session = await auth();
    if (
      session?.user?.id &&
      (pathname === "/sign-in" ||
        pathname === "/sign-up" ||
        pathname.startsWith("/sign-in/") ||
        pathname.startsWith("/sign-up/"))
    ) {
      const invite = request.nextUrl.searchParams.get("invite");
      const callbackUrl = safeCallbackUrl(
        request.nextUrl.searchParams.get("callbackUrl") ??
          (invite ? `/invite/${invite}` : undefined),
      );
      return NextResponse.redirect(new URL(callbackUrl, request.url));
    }
    return NextResponse.next();
  }

  const session = await auth();
  if (!session?.user?.id && (pathname.startsWith("/projects") || pathname.startsWith("/editor"))) {
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
