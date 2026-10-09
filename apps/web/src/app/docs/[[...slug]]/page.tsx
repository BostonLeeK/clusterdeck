import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsMarkdown } from "@/components/docs/docs-markdown";
import { DocsPager } from "@/components/docs/docs-pager";
import { DocsShell } from "@/components/docs/docs-shell";
import { DocsToc } from "@/components/docs/docs-toc";
import { getDocPage } from "@/lib/docs";
import { extractHeadings, getAdjacentDocs, listDocSlugs } from "@/lib/docs-nav";

export const runtime = "nodejs";

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

export function generateStaticParams() {
  return listDocSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug = [] } = await params;
  const page = getDocPage(slug);
  if (!page) return { title: "Docs · ClusterDeck" };
  return {
    title: `${page.title} · ClusterDeck Docs`,
    description: page.description || undefined,
  };
}

export default async function DocsCatchAllPage({ params }: PageProps) {
  const { slug = [] } = await params;
  const page = getDocPage(slug);
  if (!page) notFound();

  const headings = extractHeadings(page.body);
  const { prev, next } = getAdjacentDocs(slug);

  return (
    <DocsShell activeSlug={slug} toc={<DocsToc headings={headings} />}>
      {page.section ? (
        <p className="text-[11px] tracking-[0.16em] text-zinc-500 uppercase">{page.section}</p>
      ) : null}
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{page.title}</h1>
      {page.description ? (
        <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-400">{page.description}</p>
      ) : null}

      <div className="mt-8">
        <DocsMarkdown content={page.body} />
      </div>

      <DocsPager prev={prev} next={next} />
    </DocsShell>
  );
}
