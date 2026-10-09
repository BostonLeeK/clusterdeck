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
  { section: "Integrations", title: "Live status", slug: ["live-status"] },
];

export function docsHref(slug: string[]) {
  return slug.length ? `/docs/${slug.join("/")}` : "/docs";
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

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
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
