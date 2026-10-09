import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { docsSections } from "@/lib/docs";

export function DocsShell({
  children,
  activeSlug,
  toc,
}: {
  children: ReactNode;
  activeSlug: string[];
  toc?: ReactNode;
}) {
  const sections = docsSections();

  return (
    <div className="min-h-screen bg-[#0b0b0d] text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-[#1e1e22] bg-[#0b0b0d]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center rounded-lg hover:opacity-90">
              <Logo />
            </Link>
            <span className="hidden text-sm text-zinc-500 sm:inline">Docs</span>
          </div>
          <nav className="flex items-center gap-5 text-sm text-zinc-400">
            <Link href="/docs" className="text-white">
              Docs
            </Link>
            <Link href="/support" className="hover:text-zinc-200">
              Support
            </Link>
            <Link href="/sign-in" className="hover:text-zinc-200">
              Login
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_200px]">
        <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <DocsSidebar sections={sections} activeSlug={activeSlug} />
        </aside>

        <main className="min-w-0 pb-16">{children}</main>

        <aside className="hidden xl:block">
          <div className="sticky top-20">{toc}</div>
        </aside>
      </div>
    </div>
  );
}
