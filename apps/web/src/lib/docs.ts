import { readFileSync } from "node:fs";
import { join } from "node:path";

export type DocNavItem = {
  title: string;
  slug: string[];
  section?: string;
};

export type DocPage = {
  title: string;
  description: string;
  slug: string[];
  body: string;
  section?: string;
};

const CONTENT_DIR = join(process.cwd(), "content/docs");

export const DOCS_NAV: DocNavItem[] = [
  { section: "Start here", title: "Overview", slug: [] },
  { section: "Start here", title: "Getting started", slug: ["getting-started"] },
  { section: "Start here", title: "Accounts", slug: ["accounts"] },

  { section: "Workspace", title: "Projects", slug: ["projects"] },
  { section: "Workspace", title: "Templates", slug: ["templates"] },
  { section: "Workspace", title: "Teams", slug: ["teams"] },
  { section: "Workspace", title: "Trash", slug: ["trash"] },

  { section: "Editor", title: "Canvas overview", slug: ["editor"] },
  { section: "Editor", title: "Nodes", slug: ["editor", "nodes"] },
  { section: "Editor", title: "Edges & connectors", slug: ["editor", "edges"] },
  { section: "Editor", title: "Groups & containers", slug: ["editor", "groups"] },
  { section: "Editor", title: "Nested diagrams", slug: ["editor", "nested"] },
  { section: "Editor", title: "Tags & flows", slug: ["editor", "tags-flows"] },
  { section: "Editor", title: "History", slug: ["editor", "history"] },
  { section: "Editor", title: "Keyboard shortcuts", slug: ["editor", "shortcuts"] },

  { section: "Collaborate", title: "Realtime", slug: ["collaboration"] },
  { section: "Collaborate", title: "Sharing", slug: ["sharing"] },

  { section: "Integrations", title: "Export & import", slug: ["export-import"] },
  { section: "Integrations", title: "AI diagram", slug: ["ai"] },
  { section: "Integrations", title: "MCP", slug: ["mcp"] },
];

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

export function docsHref(slug: string[]) {
  return slug.length ? `/docs/${slug.join("/")}` : "/docs";
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

export function listDocSlugs() {
  return DOCS_NAV.map((item) => item.slug);
}

export function getAdjacentDocs(slug: string[]) {
  const index = DOCS_NAV.findIndex(
    (item) => item.slug.length === slug.length && item.slug.every((part, i) => part === slug[i]),
  );
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? DOCS_NAV[index - 1]! : null,
    next: index < DOCS_NAV.length - 1 ? DOCS_NAV[index + 1]! : null,
  };
}

export function extractHeadings(markdown: string) {
  return markdown
    .split("\n")
    .flatMap((line) => {
      const match = /^(#{2,3})\s+(.+)$/.exec(line.trim());
      if (!match) return [];
      const level = match[1]!.length;
      const text = match[2]!.replace(/[#*`]/g, "").trim();
      const id = slugify(text);
      return [{ level, text, id }];
    });
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function docsSections() {
  const sections: { title: string; items: DocNavItem[] }[] = [];
  for (const item of DOCS_NAV) {
    const title = item.section ?? "Docs";
    const current = sections.find((section) => section.title === title);
    if (current) current.items.push(item);
    else sections.push({ title, items: [item] });
  }
  return sections;
}
