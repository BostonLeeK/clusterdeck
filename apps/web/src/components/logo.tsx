import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  name,
  showName = true,
  size = "md",
}: {
  className?: string;
  name?: string;
  showName?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const label = name ?? "ClusterDeck";
  const mark = size === "xl" ? 84 : size === "lg" ? 40 : size === "sm" ? 22 : 28;
  const text =
    size === "xl" ? "text-[45px]" : size === "lg" ? "text-[22px]" : size === "sm" ? "text-[13px]" : "text-[15px]";
  const gap = size === "xl" ? "gap-4" : "gap-2.5";

  return (
    <span className={cn("inline-flex items-center", gap, className)}>
      <Image
        src="/brand/mark.png"
        alt={label}
        width={mark}
        height={mark}
        className="object-contain"
        style={{ width: mark, height: mark }}
        priority
      />
      {showName ? (
        <span className={cn("font-semibold tracking-tight text-zinc-100", text)}>{label}</span>
      ) : null}
    </span>
  );
}
