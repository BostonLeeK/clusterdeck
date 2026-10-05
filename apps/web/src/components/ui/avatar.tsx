import { cn, initials } from "@/lib/utils";

const colors = ["#5963fa", "#60a5fa", "#34d399", "#c084fc", "#fbbf24"];

export function Avatar({
  name,
  email,
  image,
  className,
}: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  className?: string;
}) {
  const seed = name || email || "u";
  const color = colors[seed.charCodeAt(0) % colors.length];
  if (image) {
    return (
      <span
        className={cn(
          "inline-block size-7 overflow-hidden rounded-full bg-cover bg-center",
          className,
        )}
        style={{ backgroundImage: `url(${image})` }}
        aria-label={name ?? ""}
      />
    );
  }
  return (
    <span
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-full text-[11px] font-semibold text-zinc-950",
        className,
      )}
      style={{ background: color }}
    >
      {initials(name, email)}
    </span>
  );
}
