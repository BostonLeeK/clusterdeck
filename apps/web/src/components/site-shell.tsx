import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

export function SiteShell({
  children,
  active,
}: {
  children: ReactNode;
  active?: "docs" | "support";
}) {
  return (
    <div className="min-h-screen bg-[#0b0b0d] text-zinc-100">
      <header className="border-b border-[#1e1e22]">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <Link href="/sign-in" className="rounded-lg hover:opacity-90">
            <Logo />
          </Link>
          <nav className="flex items-center gap-5 text-sm text-zinc-400">
            <Link
              href="/docs"
              className={active === "docs" ? "text-white" : "hover:text-zinc-200"}
            >
              Docs
            </Link>
            <Link
              href="/support"
              className={active === "support" ? "text-white" : "hover:text-zinc-200"}
            >
              Support
            </Link>
            <Link href="/sign-in" className="hover:text-zinc-200">
              Login
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">{children}</main>
    </div>
  );
}
