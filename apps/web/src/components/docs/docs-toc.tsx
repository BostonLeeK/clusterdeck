export function DocsToc({
  headings,
}: {
  headings: { level: number; text: string; id: string }[];
}) {
  if (!headings.length) return null;

  return (
    <div>
      <p className="mb-2 text-[11px] font-medium tracking-[0.14em] text-zinc-500 uppercase">
        On this page
      </p>
      <ul className="space-y-1.5 border-l border-[#242428] pl-3">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className={
                heading.level === 3
                  ? "block text-xs text-zinc-500 hover:text-zinc-300"
                  : "block text-sm text-zinc-400 hover:text-zinc-200"
              }
              style={heading.level === 3 ? { paddingLeft: 10 } : undefined}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
