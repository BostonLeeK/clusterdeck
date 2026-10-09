import Link from "next/link";
import type { ReactNode } from "react";
import type { Components } from "react-markdown";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { slugify } from "@/lib/docs-nav";

const components: Components = {
  a: ({ href, children }) => {
    if (!href) return <span>{children}</span>;
    const external = href.startsWith("http://") || href.startsWith("https://");
    if (external) {
      return (
        <a href={href} target="_blank" rel="noreferrer">
          {children}
        </a>
      );
    }
    return <Link href={href}>{children}</Link>;
  },
  h2: ({ children }) => {
    const text = nodeText(children);
    return <h2 id={slugify(text)}>{children}</h2>;
  },
  h3: ({ children }) => {
    const text = nodeText(children);
    return <h3 id={slugify(text)}>{children}</h3>;
  },
};

function nodeText(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(nodeText).join("");
  if (children && typeof children === "object" && "props" in children) {
    const props = children.props as { children?: ReactNode };
    return nodeText(props.children);
  }
  return "";
}

export function DocsMarkdown({ content }: { content: string }) {
  return (
    <div className="docs-markdown markdown-body">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </Markdown>
    </div>
  );
}
