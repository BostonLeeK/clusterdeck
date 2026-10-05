"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@iconify/react";
import { Boxes, Cpu, Database, HardDrive, Network, Users } from "lucide-react";
import { loginUser, oauthSignIn, registerUser } from "@/actions/auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const [error, setError] = useState<string | null>(null);
  const action = mode === "sign-up" ? registerUser : loginUser;

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[#0b0b0d] lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between p-10 lg:flex">
        <Logo size="xl" />
        <AuthHeroGraph />
        <p className="max-w-md text-[42px] leading-[1.05] font-semibold tracking-tight">
          Map your infrastructure.
          <br />
          Together.
        </p>
      </div>
      <div className="flex items-center justify-center border-l border-[#1e1e22] p-8">
        <div className="w-full max-w-[380px]">
          <h1 className="mb-8 text-center text-[28px] font-semibold tracking-tight">
            {mode === "sign-up" ? "Create your account" : "Sign in"}
          </h1>
          <div className="space-y-2.5">
            <Button className="h-11 w-full rounded-xl" variant="secondary" onClick={() => oauthSignIn("github")}>
              <Icon icon="simple-icons:github" className="size-4" />
              Continue with GitHub
            </Button>
            <Button className="h-11 w-full rounded-xl" variant="secondary" onClick={() => oauthSignIn("google")}>
              <Icon icon="simple-icons:google" className="size-4" />
              Continue with Google
            </Button>
          </div>
          <div className="my-6 flex items-center gap-3 text-xs text-zinc-500">
            <span className="h-px flex-1 bg-[#2a2a2e]" />
            or continue with email
            <span className="h-px flex-1 bg-[#2a2a2e]" />
          </div>
          <form
            className="space-y-4"
            action={async (formData) => {
              setError(null);
              const result = await action(formData);
              if (result?.error) setError(result.error);
            }}
          >
            {mode === "sign-up" ? (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" name="name" type="text" placeholder="Bohdan" required className="h-11" />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" name="email" type="email" placeholder="you@company.com" required className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={8} className="h-11" />
            </div>
            {mode === "sign-up" ? (
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  className="h-11"
                />
              </div>
            ) : null}
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <Button className="h-11 w-full rounded-xl" type="submit">
              {mode === "sign-up" ? "Create account" : "Sign in"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-zinc-500">
            {mode === "sign-up" ? (
              <>
                Already have an account?{" "}
                <a className="text-indigo-400 hover:text-indigo-300" href="/sign-in">
                  Sign in
                </a>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <a className="text-indigo-400 hover:text-indigo-300" href="/sign-up">
                  Create one
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function AuthHeroGraph() {
  return (
    <div className="relative mx-auto aspect-[560/320] w-full max-w-[560px] overflow-hidden rounded-2xl border border-[#1e1e22] bg-[#0c0c0f]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage: "radial-gradient(#3f3f46 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />

      <svg className="absolute inset-0 size-full" viewBox="0 0 560 320" fill="none" aria-hidden>
        <path d="M156 160 C 190 160, 190 64, 224 64" stroke="#3f3f46" strokeWidth="1.5" />
        <path d="M156 160 C 190 160, 190 160, 224 160" stroke="#3f3f46" strokeWidth="1.5" />
        <path d="M156 160 C 190 160, 190 256, 224 256" stroke="#3f3f46" strokeWidth="1.5" />
        <path d="M384 64 C 410 64, 410 112, 392 112" stroke="#3f3f46" strokeWidth="1.5" />
        <path d="M384 160 C 410 160, 410 112, 392 112" stroke="#3f3f46" strokeWidth="1.5" />
        <path d="M384 160 C 410 160, 410 208, 392 208" stroke="#3f3f46" strokeWidth="1.5" />
        <path d="M384 256 C 410 256, 410 208, 392 208" stroke="#3f3f46" strokeWidth="1.5" />
        <text x="178" y="108" fill="#71717a" fontSize="10">
          HTTPS
        </text>
        <text x="182" y="152" fill="#71717a" fontSize="10">
          gRPC
        </text>
        <text x="178" y="214" fill="#71717a" fontSize="10">
          events
        </text>
        <text x="400" y="96" fill="#71717a" fontSize="10">
          SQL
        </text>
        <text x="400" y="192" fill="#71717a" fontSize="10">
          TCP
        </text>
      </svg>

      <div className="absolute top-[128px] left-[16px] w-[140px]">
        <HeroNode
          icon={<Users className="size-3.5" />}
          accent="#a1a1aa"
          title="mobile-app"
          subtitle="Client · iOS / Android"
        />
      </div>
      <div className="absolute top-[32px] left-[224px] w-[160px]">
        <HeroNode
          icon={<Network className="size-3.5" />}
          accent="#60a5fa"
          title="api-gateway"
          subtitle="CloudFront · ingress"
        />
      </div>
      <div className="absolute top-[128px] left-[224px] w-[160px]">
        <HeroNode
          icon={<Boxes className="size-3.5" />}
          accent="#818cf8"
          title="auth-service"
          subtitle="Node.js · Service"
          selected
          chips={[
            { icon: "lucide:plug", label: "8080" },
            { icon: "simple-icons:kubernetes", label: "k8s" },
          ]}
        />
      </div>
      <div className="absolute top-[224px] left-[224px] w-[160px]">
        <HeroNode
          icon={<Cpu className="size-3.5" />}
          accent="#34d399"
          title="auth-worker"
          subtitle="Queue · 1 replica"
        />
      </div>
      <div className="absolute top-[80px] left-[392px] w-[152px]">
        <HeroNode
          icon={<Database className="size-3.5" />}
          accent="#38bdf8"
          title="postgres-main"
          subtitle="PostgreSQL · primary"
        />
      </div>
      <div className="absolute top-[176px] left-[392px] w-[152px]">
        <HeroNode
          icon={<HardDrive className="size-3.5" />}
          accent="#f97316"
          title="redis-cache"
          subtitle="Redis · sessions"
        />
      </div>
    </div>
  );
}

function HeroNode({
  icon,
  accent,
  title,
  subtitle,
  chips,
  selected,
}: {
  icon: ReactNode;
  accent: string;
  title: string;
  subtitle: string;
  chips?: { icon: string; label: string }[];
  selected?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-[#141416] px-2.5 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
        selected && "ring-1 ring-indigo-400/35",
      )}
      style={{ borderColor: selected ? "#818cf8" : `${accent}66` }}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="grid size-6 shrink-0 place-items-center rounded-md bg-white/5"
            style={{ color: accent }}
          >
            {icon}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[11px] font-medium text-zinc-100">{title}</div>
            <div className="truncate text-[9px] text-zinc-500">{subtitle}</div>
          </div>
        </div>
        <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-emerald-400" />
      </div>
      {chips?.length ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {chips.map((chip) => (
            <span
              key={`${chip.icon}-${chip.label}`}
              className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-zinc-300"
            >
              <Icon icon={chip.icon} className="size-2.5 text-zinc-400" />
              {chip.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
