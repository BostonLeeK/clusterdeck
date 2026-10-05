"use client";

import { useEffect, useState } from "react";
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
  const color = colors[Math.abs(seed.charCodeAt(0)) % colors.length];
  const src = image?.trim() || null;
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  if (src && !broken) {
    return (
      <span
        className={cn("relative inline-flex size-7 shrink-0 overflow-hidden rounded-full bg-zinc-800", className)}
        aria-label={name ?? email ?? "User"}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-zinc-950",
        className,
      )}
      style={{ background: color }}
      aria-label={name ?? email ?? "User"}
    >
      {initials(name, email)}
    </span>
  );
}
