import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Box, Circle, Cylinder, Hexagon } from "lucide-react";
import { Logo } from "@/components/logo";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-[#121214] lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#0d0d0f] p-10 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_45%,rgba(99,102,241,0.08),transparent_60%)]"
        />
        <Link href="/" className="relative flex w-fit items-center rounded-xl hover:opacity-90">
          <Logo size="xl" />
        </Link>
        <AuthHeroGraph />
        <p className="relative max-w-md text-[40px] leading-[1.1] font-medium tracking-tight text-zinc-100">
          Map your infrastructure.
          <br />
          Together.
        </p>
      </div>
      <div className="flex items-center justify-center p-5 sm:p-8 lg:border-l lg:border-[#1e1e22]">
        <div className="w-full max-w-[360px]">{children}</div>
      </div>
    </div>
  );
}

type HeroNode = {
  id: string;
  x: number;
  y: number;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
  tint?: string;
};

type HeroEdge = { from: string; to: string; color: string; label?: { text: string; x: number; y: number } };

const NODE_WIDTH = 124;
const NODE_HEIGHT = 44;
const FONT = "Inter, system-ui, sans-serif";

const HERO_NODES: HeroNode[] = [
  { id: "client", x: 0, y: 138, title: "Web client", subtitle: "entry point", icon: Circle, color: "#d4d4d8" },
  { id: "gateway", x: 184, y: 40, title: "API gateway", subtitle: "HTTPS · ingress", icon: Hexagon, color: "#818cf8" },
  { id: "auth", x: 184, y: 138, title: "Auth service", subtitle: "gRPC · core", icon: Hexagon, color: "#818cf8" },
  { id: "worker", x: 184, y: 236, title: "Event worker", subtitle: "async · queue", icon: Hexagon, color: "#34d399" },
  { id: "postgres", x: 374, y: 88, title: "PostgreSQL", subtitle: "primary data", icon: Cylinder, color: "#34d399" },
  {
    id: "queue",
    x: 374,
    y: 188,
    title: "Message queue",
    subtitle: "events · Kafka",
    icon: Box,
    color: "#fb923c",
    tint: "#1c1714",
  },
];

const HUB = { x: 530, y: 132, width: 22, height: 56 };

const HERO_EDGES: HeroEdge[] = [
  { from: "client", to: "gateway", color: "#6366f1", label: { text: "HTTPS", x: 146, y: 96 } },
  { from: "client", to: "auth", color: "#6366f1", label: { text: "gRPC", x: 150, y: 154 } },
  { from: "client", to: "worker", color: "#6366f1", label: { text: "events", x: 144, y: 226 } },
  { from: "gateway", to: "postgres", color: "#52525b", label: { text: "SQL", x: 334, y: 72 } },
  { from: "auth", to: "postgres", color: "#52525b" },
  { from: "auth", to: "queue", color: "#52525b", label: { text: "async", x: 334, y: 196 } },
  { from: "worker", to: "queue", color: "#6366f1" },
];

const nodeById = new Map(HERO_NODES.map((node) => [node.id, node]));

function curve(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

function AuthHeroGraph() {
  const hubIn = { x: HUB.x, top: HUB.y + 16, bottom: HUB.y + HUB.height - 16 };
  return (
    <svg viewBox="-4 20 560 280" className="relative mx-auto w-full max-w-[600px]" fill="none" aria-hidden>
      {HERO_EDGES.map((edge) => {
        const from = nodeById.get(edge.from)!;
        const to = nodeById.get(edge.to)!;
        const x1 = from.x + NODE_WIDTH;
        const y1 = from.y + NODE_HEIGHT / 2;
        const x2 = to.x;
        const y2 = to.y + NODE_HEIGHT / 2;
        return (
          <g key={`${edge.from}-${edge.to}`}>
            <path d={curve(x1, y1, x2, y2)} stroke={edge.color} strokeOpacity={0.55} strokeWidth={1.2} />
            <circle cx={x2} cy={y2} r={2.2} fill={edge.color} />
            {edge.label ? (
              <text x={edge.label.x} y={edge.label.y} fill="#71717a" fontSize={8} fontFamily={FONT}>
                {edge.label.text}
              </text>
            ) : null}
          </g>
        );
      })}
      <path
        d={curve(374 + NODE_WIDTH, 110, hubIn.x, hubIn.top)}
        stroke="#34d399"
        strokeOpacity={0.55}
        strokeWidth={1.2}
      />
      <path
        d={curve(374 + NODE_WIDTH, 210, hubIn.x, hubIn.bottom)}
        stroke="#34d399"
        strokeOpacity={0.55}
        strokeWidth={1.2}
      />
      <rect x={HUB.x} y={HUB.y} width={HUB.width} height={HUB.height} rx={7} fill="#18181b" stroke="#2a2a2e" />
      <circle cx={HUB.x + HUB.width / 2} cy={hubIn.top} r={4} stroke="#34d399" strokeWidth={1.3} />
      <circle cx={HUB.x + HUB.width / 2} cy={hubIn.bottom} r={4} stroke="#818cf8" strokeWidth={1.3} />
      {HERO_NODES.map((node) => (
        <HeroCard key={node.id} node={node} />
      ))}
    </svg>
  );
}

function HeroCard({ node }: { node: HeroNode }) {
  const Icon = node.icon;
  return (
    <g>
      <rect
        x={node.x}
        y={node.y}
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={8}
        fill={node.tint ?? "#18181b"}
        stroke={node.tint ? "#3a2a22" : "#2a2a2e"}
      />
      <Icon x={node.x + 12} y={node.y + 11} width={12} height={12} color={node.color} strokeWidth={1.6} />
      <text x={node.x + 32} y={node.y + 19} fill="#f4f4f5" fontSize={9.5} fontWeight={500} fontFamily={FONT}>
        {node.title}
      </text>
      <text x={node.x + 32} y={node.y + 31} fill="#71717a" fontSize={7.5} fontFamily={FONT}>
        {node.subtitle}
      </text>
    </g>
  );
}
