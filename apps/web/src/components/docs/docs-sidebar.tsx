"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DocNavItem } from "@/lib/docs";
import { docsHref } from "@/lib/docs";

function slugKey(slug: string[]) {
  return slug.join("/");
}

export function DocsSidebar({
  sections,
  activeSlug,
}: {
  sections: { title: string; items: DocNavItem[] }[];
  activeSlug: string[];
}) {
  const [query, setQuery] = useState("");
  const active = slugKey(activeSlug);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.title.toLowerCase().includes(q)),
      }))
      .filter((section) => section.items.length > 0);
  }, [query, sections]);

  return (
    <div className="space-y-5">
      <label className="block">
        <span className="sr-only">Search docs</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search docs…"
          className="w-full rounded-lg border border-[#2a2a2e] bg-[#121214] px-3 py-2 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-zinc-500"
        />
      </label>

      <nav className="space-y-5">
        {filtered.map((section) => (
          <div key={section.title}>
            <p className="mb-2 text-[11px] font-medium tracking-[0.14em] text-zinc-500 uppercase">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const href = docsHref(item.slug);
                const isActive = slugKey(item.slug) === active;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={
                        isActive
                          ? "block rounded-md bg-[#18181b] px-2.5 py-1.5 text-sm font-medium text-white"
                          : "block rounded-md px-2.5 py-1.5 text-sm text-zinc-400 hover:bg-[#141416] hover:text-zinc-200"
                      }
                    >
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {filtered.length === 0 ? (
          <p className="text-sm text-zinc-500">No matching pages.</p>
        ) : null}
      </nav>
    </div>
  );
}
