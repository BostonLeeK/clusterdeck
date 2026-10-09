import Link from "next/link";
import type { DocNavItem } from "@/lib/docs-nav";
import { docsHref } from "@/lib/docs-nav";

export function DocsPager({
  prev,
  next,
}: {
  prev: DocNavItem | null;
  next: DocNavItem | null;
}) {
  if (!prev && !next) return null;

  return (
    <div className="mt-14 grid gap-3 border-t border-[#1e1e22] pt-8 sm:grid-cols-2">
      {prev ? (
        <Link
          href={docsHref(prev.slug)}
          className="rounded-xl border border-[#242428] bg-[#121214] px-4 py-3 transition hover:border-zinc-600"
        >
          <p className="text-[11px] tracking-wide text-zinc-500 uppercase">Previous</p>
          <p className="mt-1 text-sm font-medium text-zinc-100">{prev.title}</p>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={docsHref(next.slug)}
          className="rounded-xl border border-[#242428] bg-[#121214] px-4 py-3 text-right transition hover:border-zinc-600"
        >
          <p className="text-[11px] tracking-wide text-zinc-500 uppercase">Next</p>
          <p className="mt-1 text-sm font-medium text-zinc-100">{next.title}</p>
        </Link>
      ) : null}
    </div>
  );
}
