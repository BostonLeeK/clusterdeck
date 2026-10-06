import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bot,
  Check,
  Download,
  History,
  Layers3,
  Link2,
  MessageSquare,
  Plug,
  Route,
  Sparkles,
  Users,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { ProductPreview } from "@/components/landing/product-preview";
import { TechStrip } from "@/components/landing/tech-strip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#ai", label: "AI & MCP" },
  { href: "#how", label: "How it works" },
  { href: "/docs", label: "Docs" },
];

const STEPS = [
  {
    title: "Sketch the system",
    text: "Drop services, databases, queues and gateways from the library or start from a template.",
  },
  {
    title: "Build it together",
    text: "Invite your team. Everyone edits the same canvas with live cursors, comments and chat.",
  },
  {
    title: "Share the truth",
    text: "Send a read-only link to anyone, or export to draw.io, Excalidraw, PNG and SVG.",
  },
];

const MCP_CONFIG = `{
  "mcpServers": {
    "clusterdeck": {
      "url": "https://clusterdeck.space/mcp",
      "headers": {
        "Authorization": "Bearer <your token>"
      }
    }
  }
}`;

export function LandingPage({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="min-h-screen overflow-x-clip bg-[#0b0b0d] text-zinc-100">
      <LandingHeader signedIn={signedIn} />
      <main>
        <Hero signedIn={signedIn} />
        <section className="border-y border-white/[0.06] bg-[#0d0d10] py-10">
          <p className="mb-6 text-center text-xs tracking-[0.18em] text-zinc-600 uppercase">
            Model the stack you actually run
          </p>
          <TechStrip />
        </section>
        <Features />
        <AiSection />
        <HowItWorks />
        <FinalCta signedIn={signedIn} />
      </main>
      <LandingFooter />
    </div>
  );
}

function PrimaryCta({ signedIn, className }: { signedIn: boolean; className?: string }) {
  return (
    <Button asChild size="lg" className={cn("px-5", className)}>
      <Link href={signedIn ? "/projects" : "/sign-up"}>
        {signedIn ? "Open your projects" : "Start mapping"}
        <ArrowRight />
      </Link>
    </Button>
  );
}

function LandingHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0b0b0d]/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5 sm:px-6">
        <Link href="/" className="flex items-center rounded-lg hover:opacity-90">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-6 text-sm leading-none text-zinc-400 md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-zinc-100">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {signedIn ? (
            <Button asChild size="sm">
              <Link href="/projects">Open app</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/sign-up">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#1c1d22_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_50%_0%,black,transparent_70%)]"
      />
      <div className="relative mx-auto max-w-6xl px-5 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
        <div className="mx-auto max-w-3xl text-center">
          <Link
            href="#ai"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1 pr-3 pl-1 text-xs text-zinc-300 transition-colors hover:border-white/20"
          >
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[11px] font-medium text-indigo-200">New</span>
            AI assistant and MCP server for your diagrams
            <ArrowRight className="size-3 text-zinc-500" />
          </Link>
          <h1 className="mt-7 text-[40px] leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl lg:text-[68px]">
            Map your infrastructure.
            <br />
            <span className="bg-gradient-to-r from-indigo-300 via-indigo-200 to-cyan-200 bg-clip-text text-transparent">
              Together.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-pretty text-zinc-400 sm:text-lg">
            ClusterDeck is a live, collaborative canvas for your architecture. Services, data and traffic in one
            diagram your whole team, and your AI agents, can edit.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PrimaryCta signedIn={signedIn} className="w-full sm:w-auto" />
            <Button asChild size="lg" variant="secondary" className="w-full px-5 sm:w-auto">
              <Link href="/docs">Read the docs</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-zinc-600">Sign up with GitHub, Google or email</p>
        </div>
        <div className="mt-16 sm:mt-20">
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  text,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  text: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <p className="text-xs font-medium tracking-[0.18em] text-indigo-300/80 uppercase">{eyebrow}</p>
      <h2 className="mt-3 text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-[40px]">{title}</h2>
      <p className="mt-4 text-base leading-7 text-zinc-400">{text}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  text,
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[#141519] to-[#101114] p-6 transition-colors hover:border-white/[0.14]",
        className,
      )}
    >
      <div className="grid size-9 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
        <Icon className="size-4 text-indigo-300" />
      </div>
      <h3 className="mt-5 text-base font-medium text-zinc-100">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{text}</p>
      {children ? <div className="mt-6 flex flex-1 items-end">{children}</div> : null}
    </div>
  );
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24 sm:px-6 sm:py-32">
      <SectionHeading
        eyebrow="Features"
        title="Everything your architecture diagram was missing"
        text="Not another static drawing. A living model of your system that stays readable at any scale."
      />
      <div className="mt-14 grid gap-4 md:grid-cols-6">
        <FeatureCard
          icon={Users}
          title="Realtime by default"
          text="Live cursors, presence and chat. Changes sync instantly and merge without conflicts."
          className="md:col-span-4"
        >
          <RealtimeVisual />
        </FeatureCard>
        <FeatureCard
          icon={Layers3}
          title="Nested diagrams"
          text="Open any service to reveal its own inner diagram. Zoom from platform to pod without losing context."
          className="md:col-span-2"
        >
          <NestedVisual />
        </FeatureCard>
        <FeatureCard
          icon={Route}
          title="Flows and perspectives"
          text="Tag components and highlight request paths to tell the story behind each part of the system."
          className="md:col-span-2"
        >
          <FlowsVisual />
        </FeatureCard>
        <FeatureCard
          icon={Link2}
          title="Share with control"
          text="Invite editors and viewers, or publish a read-only link anyone can open without an account."
          className="md:col-span-2"
        >
          <ShareVisual />
        </FeatureCard>
        <FeatureCard
          icon={Download}
          title="Export anywhere"
          text="Take your diagram to draw.io, Excalidraw, PNG or SVG whenever you need it."
          className="md:col-span-2"
        >
          <ExportVisual />
        </FeatureCard>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {[
          { icon: History, title: "Undo and history", text: "Every edit is reversible, including AI changes." },
          { icon: MessageSquare, title: "Comments", text: "Pin questions and decisions right on the canvas." },
          { icon: Sparkles, title: "Templates", text: "Start from proven layouts instead of a blank page." },
        ].map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-[#111215] p-5"
          >
            <item.icon className="mt-0.5 size-4 shrink-0 text-zinc-400" />
            <div>
              <div className="text-sm font-medium text-zinc-100">{item.title}</div>
              <div className="mt-1 text-sm leading-6 text-zinc-500">{item.text}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RealtimeVisual() {
  const people = [
    { name: "Olena", color: "#f472b6", message: "Moved Kafka next to Orders" },
    { name: "Max", color: "#22d3ee", message: "Added retry note on Payments" },
    { name: "Artem", color: "#fbbf24", message: "Linked Redis to Identity" },
  ];
  return (
    <div className="w-full space-y-2">
      {people.map((person, index) => (
        <div
          key={person.name}
          className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#0c0d10] px-3 py-2.5"
          style={{ marginLeft: `${index * 6}%` }}
        >
          <span
            className="grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-zinc-950"
            style={{ background: person.color }}
          >
            {person.name.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 text-sm">
            <span className="text-zinc-200">{person.name}</span>
            <span className="text-zinc-500"> · {person.message}</span>
          </div>
          <span className="ml-auto hidden text-xs text-zinc-600 sm:block">now</span>
        </div>
      ))}
    </div>
  );
}

function NestedVisual() {
  const levels = ["Platform", "Orders service", "Workers"];
  return (
    <div className="relative h-[116px] w-full">
      {levels.map((level, index) => {
        const current = index === levels.length - 1;
        return (
          <div
            key={level}
            className={cn(
              "absolute flex h-11 items-center gap-2 rounded-xl border px-3 text-sm shadow-[0_8px_24px_-8px_rgba(0,0,0,0.8)]",
              current
                ? "border-indigo-400/30 bg-[#17182a] text-zinc-100"
                : "border-white/[0.08] bg-[#15161a] text-zinc-500",
            )}
            style={{ left: `${index * 10}%`, right: `${(levels.length - 1 - index) * 5}%`, top: index * 36 }}
          >
            <span className={cn("size-2 rounded-full", current ? "bg-indigo-400" : "bg-zinc-600")} />
            {level}
            {current ? null : <span className="ml-auto text-xs text-zinc-600">open ›</span>}
          </div>
        );
      })}
    </div>
  );
}

function FlowsVisual() {
  const tags = [
    { label: "checkout", color: "#818cf8" },
    { label: "pii", color: "#f472b6" },
    { label: "critical", color: "#f87171" },
    { label: "async", color: "#34d399" },
  ];
  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag.label}
            className="rounded-full border px-2.5 py-0.5 text-xs"
            style={{ borderColor: `${tag.color}55`, color: tag.color, background: `${tag.color}12` }}
          >
            #{tag.label}
          </span>
        ))}
      </div>
      <svg viewBox="0 0 240 40" className="mt-4 w-full" fill="none" aria-hidden>
        <path d="M 8 30 C 60 30, 60 10, 120 10 S 180 30, 232 30" stroke="#3f3f46" strokeWidth={1.5} />
        <path d="M 8 30 C 60 30, 60 10, 120 10 S 180 30, 232 30" stroke="#818cf8" strokeWidth={2} className="edge-flow-dash" />
        {[8, 120, 232].map((cx, index) => (
          <circle key={cx} cx={cx} cy={index === 1 ? 10 : 30} r={4} fill="#0b0b0d" stroke="#818cf8" strokeWidth={1.5} />
        ))}
      </svg>
    </div>
  );
}

function ShareVisual() {
  return (
    <div className="w-full space-y-2 text-sm">
      <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-[#0c0d10] px-3 py-2">
        <Link2 className="size-3.5 text-zinc-500" />
        <span className="truncate text-zinc-400">clusterdeck.space/p/7f3a…</span>
        <span className="ml-auto h-4 w-7 shrink-0 rounded-full bg-primary p-0.5">
          <span className="ml-auto block size-3 rounded-full bg-white" />
        </span>
      </div>
      {[
        { email: "olena@team.dev", role: "Editor" },
        { email: "max@team.dev", role: "Viewer" },
      ].map((member) => (
        <div key={member.email} className="flex items-center justify-between px-1 text-zinc-500">
          <span className="truncate">{member.email}</span>
          <span className="text-xs text-zinc-400">{member.role}</span>
        </div>
      ))}
    </div>
  );
}

function ExportVisual() {
  return (
    <div className="flex w-full flex-wrap gap-2">
      {["draw.io", "Excalidraw", "PNG", "SVG"].map((format) => (
        <span
          key={format}
          className="rounded-lg border border-white/[0.08] bg-[#0c0d10] px-3 py-1.5 font-mono text-xs text-zinc-300"
        >
          {format}
        </span>
      ))}
    </div>
  );
}

function AiSection() {
  const points = [
    { icon: Bot, text: "Built-in AI assistant that edits the canvas, using your own OpenAI key." },
    { icon: Plug, text: "MCP server for Cursor, Claude, n8n and any MCP-compatible agent." },
    { icon: History, text: "Every AI change lands in history, so one undo rolls it back." },
  ];
  return (
    <section id="ai" className="scroll-mt-20 border-y border-white/[0.06] bg-[#0d0d10]">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-24 sm:px-6 sm:py-32 lg:grid-cols-2">
        <div>
          <SectionHeading
            eyebrow="AI & MCP"
            title="Describe the change. Watch the diagram update."
            text="Ask in plain language and ClusterDeck adds nodes, wires connections and fills in details. Or let your coding agent keep the diagram in sync with the code it ships."
          />
          <ul className="mt-8 space-y-4">
            {points.map((point) => (
              <li key={point.text} className="flex items-start gap-3 text-sm leading-6 text-zinc-300">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                  <point.icon className="size-3.5 text-indigo-300" />
                </span>
                {point.text}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-4">
          <AiChatCard />
          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0a0a0c]">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-2.5 text-xs text-zinc-500">
              <Plug className="size-3.5" />
              mcp.json
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-6 text-zinc-400">
              <code>{MCP_CONFIG}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

function AiChatCard() {
  const operations = [
    { sign: "+", text: "Redis cache", detail: "node · cache" },
    { sign: "+", text: "Orders service → Redis cache", detail: "edge · reads" },
    { sign: "~", text: "Orders service", detail: "tech · ioredis" },
  ];
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#121317] p-5">
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary/90 px-4 py-2.5 text-sm text-white">
        Add a Redis cache in front of Orders and route reads through it
      </div>
      <div className="mt-4 flex gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-indigo-400/10">
          <Sparkles className="size-3.5 text-indigo-300" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-zinc-300">Done. I added a cache and connected it to Orders.</p>
          <div className="mt-3 divide-y divide-white/[0.05] rounded-xl border border-white/[0.06] bg-[#0c0d10]">
            {operations.map((operation) => (
              <div key={operation.text} className="flex items-center gap-3 px-3 py-2 text-xs">
                <span
                  className={cn(
                    "font-mono font-semibold",
                    operation.sign === "+" ? "text-emerald-400" : "text-amber-300",
                  )}
                >
                  {operation.sign}
                </span>
                <span className="truncate text-zinc-200">{operation.text}</span>
                <span className="ml-auto shrink-0 text-zinc-600">{operation.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24 sm:px-6 sm:py-32">
      <SectionHeading
        eyebrow="How it works"
        title="From whiteboard to source of truth in minutes"
        text="No installs, no plugins. Open the browser and start drawing on a desktop, laptop or phone."
        className="mx-auto text-center"
      />
      <ol className="mt-14 grid gap-4 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="relative rounded-2xl border border-white/[0.07] bg-[#111215] p-6">
            <span className="font-mono text-xs text-indigo-300/80">0{index + 1}</span>
            <h3 className="mt-3 text-base font-medium text-zinc-100">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function FinalCta({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-6 sm:pb-32">
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#111216] px-6 py-16 text-center sm:px-12 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,rgba(89,99,250,0.35),transparent_60%)]"
        />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-[44px]">
            Give your team one map of the system
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-zinc-400">
            Start with a blank canvas or a template, then invite your team when you are ready.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <PrimaryCta signedIn={signedIn} className="w-full sm:w-auto" />
            <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-zinc-500">
              {["Realtime collaboration", "Public read-only links"].map((perk) => (
                <li key={perk} className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-emerald-400" />
                  {perk}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-4">
          <Logo size="sm" />
          <span className="text-xs text-zinc-600">© {new Date().getFullYear()} ClusterDeck</span>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-500">
          <Link href="/docs" className="hover:text-zinc-200">
            Docs
          </Link>
          <Link href="/support" className="hover:text-zinc-200">
            Support
          </Link>
          <Link href="/sign-in" className="hover:text-zinc-200">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
