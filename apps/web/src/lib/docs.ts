import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DOCS_NAV, type DocPage } from "@/lib/docs-nav";

export type { DocNavItem, DocPage } from "@/lib/docs-nav";
export {
  DOCS_NAV,
  docsHref,
  docsSections,
  extractHeadings,
  getAdjacentDocs,
  listDocSlugs,
  slugify,
} from "@/lib/docs-nav";

const CONTENT_DIR = join(process.cwd(), "content/docs");

function slugToFile(slug: string[]) {
  if (!slug.length) return join(CONTENT_DIR, "index.md");
  return join(CONTENT_DIR, ...slug) + ".md";
}

function parseFrontmatter(raw: string) {
  if (!raw.startsWith("---\n")) {
    return { meta: {} as Record<string, string>, body: raw.trim() };
  }
  const end = raw.indexOf("\n---\n", 4);
  if (end === -1) return { meta: {} as Record<string, string>, body: raw.trim() };
  const block = raw.slice(4, end);
  const body = raw.slice(end + 5).trim();
  const meta: Record<string, string> = {};
  for (const line of block.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    meta[key] = value;
  }
  return { meta, body };
}

export function getDocPage(slug: string[]): DocPage | null {
  const nav = DOCS_NAV.find(
    (item) => item.slug.length === slug.length && item.slug.every((part, i) => part === slug[i]),
  );
  if (!nav) return null;
  try {
    const raw = readFileSync(slugToFile(slug), "utf8");
    const { meta, body } = parseFrontmatter(raw);
    return {
      title: meta.title ?? nav.title,
      description: meta.description ?? "",
      slug,
      body,
      section: nav.section,
    };
  } catch {
    return null;
  }
}
