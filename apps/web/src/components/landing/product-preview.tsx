import type { ReactNode } from "react";
import Image from "next/image";
import { ChevronRight, MousePointer2, Share2 } from "lucide-react";
import { NODE_LIBRARY, type InfraNodeTypeId } from "@dataflow/shared";
import { NODE_ICONS } from "@/lib/icons";
import { cn } from "@/lib/utils";

const CARD_WIDTH = 148;
const CARD_HEIGHT = 50;
const FONT = "Inter, system-ui, sans-serif";

type PreviewNode = {
  id: string;
  type: InfraNodeTypeId;
  x: number;
  y: number;
  title: string;
  subtitle: string;
  selected?: boolean;
  inner?: number;
};

type PreviewEdge = {
  from: string;
  to: string;
  flow?: boolean;
  label?: string;
};

const NODES: PreviewNode[] = [
  { id: "users", type: "user", x: 16, y: 176, title: "Customers", subtitle: "web · mobile" },
  { id: "cdn", type: "cdn", x: 206, y: 62, title: "Edge CDN", subtitle: "static assets" },
  { id: "gateway", type: "api-gateway", x: 206, y: 176, title: "API gateway", subtitle: "HTTPS · ingress" },
  { id: "auth", type: "auth", x: 206, y: 290, title: "Identity", subtitle: "OIDC · sessions" },
  { id: "orders", type: "service", x: 396, y: 120, title: "Orders service", subtitle: "Node.js · core", selected: true, inner: 6 },
  { id: "payments", type: "lambda", x: 396, y: 240, title: "Payments", subtitle: "function · async" },
  { id: "postgres", type: "postgres", x: 586, y: 62, title: "PostgreSQL", subtitle: "primary data" },
  { id: "kafka", type: "kafka", x: 586, y: 182, title: "Kafka", subtitle: "order events" },
  { id: "redis", type: "redis", x: 586, y: 302, title: "Redis", subtitle: "sessions · cache" },
];

const EDGES: PreviewEdge[] = [
  { from: "users", to: "cdn" },
  { from: "users", to: "gateway", flow: true, label: "HTTPS" },
  { from: "users", to: "auth" },
  { from: "gateway", to: "orders", flow: true, label: "REST" },
  { from: "gateway", to: "payments" },
  { from: "orders", to: "postgres", label: "SQL" },
  { from: "orders", to: "kafka", flow: true, label: "events" },
  { from: "payments", to: "kafka" },
  { from: "auth", to: "redis" },
];

const TYPE_COLORS = new Map(NODE_LIBRARY.map((definition) => [definition.id, definition.color]));
const nodeById = new Map(NODES.map((node) => [node.id, node]));

const COLLABORATORS = [
  { initials: "OK", color: "#f472b6" },
  { initials: "MD", color: "#22d3ee" },
  { initials: "AV", color: "#fbbf24" },
];

const LIBRARY: { type: InfraNodeTypeId; label: string }[] = [
  { type: "service", label: "Service" },
  { type: "lambda", label: "Function" },
  { type: "postgres", label: "Database" },
  { type: "redis", label: "Cache" },
  { type: "kafka", label: "Kafka" },
  { type: "api-gateway", label: "Gateway" },
];

function curve(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

export function ProductPreview() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-10 -top-10 bottom-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(89,99,250,0.22),transparent_65%)] blur-2xl"
      />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0f1013] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] ring-1 ring-black/40">
        <PreviewHeader />
        <div className="flex">
          <PreviewLibrary />
          <div className="relative min-w-0 flex-1 bg-[radial-gradient(#26272c_1px,transparent_1px)] [background-size:18px_18px]">
            <PreviewCanvas />
          </div>
          <PreviewDetails />
        </div>
      </div>
    </div>
  );
}

function PreviewHeader() {
  return (
    <div className="flex h-11 items-center gap-3 border-b border-white/[0.06] bg-[#121317] px-3 sm:px-4">
      <Image src="/brand/mark.png" alt="" width={20} height={20} className="size-5 object-contain" />
      <div className="flex min-w-0 items-center gap-1.5 text-xs text-zinc-500">
        <span className="hidden truncate sm:inline">Payments platform</span>
        <ChevronRight className="hidden size-3 sm:block" />
        <span className="truncate text-zinc-200">Checkout</span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="flex -space-x-1.5">
          {COLLABORATORS.map((person) => (
            <span
              key={person.initials}
              className="grid size-6 place-items-center rounded-full border-2 border-[#121317] text-[9px] font-semibold text-zinc-950"
              style={{ background: person.color }}
            >
              {person.initials}
            </span>
          ))}
        </div>
        <span className="hidden items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-medium text-white sm:inline-flex">
          <Share2 className="size-3" />
          Share
        </span>
      </div>
    </div>
  );
}

function PreviewLibrary() {
  return (
    <div className="hidden w-40 shrink-0 border-r border-white/[0.06] bg-[#111215] p-3 md:block">
      <div className="mb-2 text-[10px] tracking-[0.14em] text-zinc-600 uppercase">Library</div>
      <div className="space-y-1">
        {LIBRARY.map((item) => {
          const Icon = NODE_ICONS[item.type];
          return (
            <div
              key={item.type}
              className="flex items-center gap-2 rounded-lg border border-white/[0.04] bg-white/[0.02] px-2 py-1.5 text-[11px] text-zinc-300"
            >
              <Icon className="size-3.5" style={{ color: TYPE_COLORS.get(item.type) }} />
              {item.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PreviewDetails() {
  return (
    <div className="hidden w-52 shrink-0 border-l border-white/[0.06] bg-[#111215] p-4 lg:block">
      <div className="text-[10px] tracking-[0.14em] text-zinc-600 uppercase">Service</div>
      <div className="mt-1 text-sm font-medium text-zinc-100">Orders service</div>
      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-400">
        <span className="size-1.5 rounded-full bg-emerald-400 animate-status-pulse" />
        Healthy
      </div>
      <DetailsBlock title="Stack">
        <div className="flex flex-wrap gap-1">
          {["Node.js", "TypeScript", "gRPC"].map((tech) => (
            <span key={tech} className="rounded-md border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-zinc-300">
              {tech}
            </span>
          ))}
        </div>
      </DetailsBlock>
      <DetailsBlock title="Connectors">
        {[
          { label: "API gateway", direction: "in" },
          { label: "PostgreSQL", direction: "out" },
          { label: "Kafka", direction: "out" },
        ].map((connector) => (
          <div key={connector.label} className="flex items-center justify-between py-0.5 text-[11px] text-zinc-400">
            {connector.label}
            <span
              className={cn(
                "rounded px-1 text-[9px] uppercase",
                connector.direction === "in" ? "bg-emerald-400/10 text-emerald-300" : "bg-indigo-400/10 text-indigo-300",
              )}
            >
              {connector.direction}
            </span>
          </div>
        ))}
      </DetailsBlock>
      <DetailsBlock title="Inner diagram">
        <div className="rounded-lg border border-dashed border-white/10 px-2 py-1.5 text-[11px] text-zinc-400">
          6 components · open
        </div>
      </DetailsBlock>
    </div>
  );
}

function DetailsBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <div className="mb-1.5 text-[10px] text-zinc-600">{title}</div>
      {children}
    </div>
  );
}

function PreviewCanvas() {
  return (
    <svg
      viewBox="0 0 750 380"
      className="block h-auto w-full max-sm:-ml-[35%] max-sm:w-[170%] max-sm:max-w-none"
      fill="none"
      aria-hidden
    >
      {EDGES.map((edge) => {
        const from = nodeById.get(edge.from)!;
        const to = nodeById.get(edge.to)!;
        const x1 = from.x + CARD_WIDTH;
        const y1 = from.y + CARD_HEIGHT / 2;
        const x2 = to.x;
        const y2 = to.y + CARD_HEIGHT / 2;
        const path = curve(x1, y1, x2, y2);
        return (
          <g key={`${edge.from}-${edge.to}`}>
            <path d={path} stroke={edge.flow ? "#5963fa" : "#3f3f46"} strokeOpacity={edge.flow ? 0.35 : 0.9} strokeWidth={1.3} />
            {edge.flow ? <path d={path} stroke="#818cf8" strokeWidth={1.6} className="edge-flow-dash" /> : null}
            <circle cx={x2} cy={y2} r={2.4} fill={edge.flow ? "#818cf8" : "#52525b"} />
            {edge.label ? (
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2 - 6}
                textAnchor="middle"
                fill="#71717a"
                fontSize={8.5}
                fontFamily={FONT}
              >
                {edge.label}
              </text>
            ) : null}
          </g>
        );
      })}
      {NODES.map((node) => (
        <PreviewCard key={node.id} node={node} />
      ))}
      <g transform="translate(24 300)">
        <rect width={118} height={40} rx={8} fill="#2a2414" stroke="#4a3f1d" />
        <text x={10} y={16} fill="#fde68a" fontSize={8.5} fontWeight={500} fontFamily={FONT}>
          Retry policy?
        </text>
        <text x={10} y={29} fill="#a3925a" fontSize={7.5} fontFamily={FONT}>
          @max · 2 replies
        </text>
      </g>
      <PreviewCursor className="landing-cursor-a" x={350} y={96} name="Olena" color="#f472b6" />
      <PreviewCursor className="landing-cursor-b" x={548} y={268} name="Max" color="#22d3ee" />
    </svg>
  );
}

function PreviewCard({ node }: { node: PreviewNode }) {
  const Icon = NODE_ICONS[node.type];
  const color = TYPE_COLORS.get(node.type) ?? "#a1a1aa";
  return (
    <g>
      {node.selected ? (
        <rect
          x={node.x - 4}
          y={node.y - 4}
          width={CARD_WIDTH + 8}
          height={CARD_HEIGHT + 8}
          rx={12}
          stroke="#818cf8"
          strokeOpacity={0.6}
          strokeWidth={1.2}
        />
      ) : null}
      <rect x={node.x} y={node.y} width={CARD_WIDTH} height={CARD_HEIGHT} rx={9} fill="#17181c" stroke="#2a2b31" />
      <rect x={node.x + 10} y={node.y + 12} width={26} height={26} rx={7} fill={color} fillOpacity={0.12} />
      <Icon x={node.x + 16} y={node.y + 18} width={14} height={14} color={color} strokeWidth={1.8} />
      <text x={node.x + 46} y={node.y + 22} fill="#f4f4f5" fontSize={10} fontWeight={500} fontFamily={FONT}>
        {node.title}
      </text>
      <text x={node.x + 46} y={node.y + 35} fill="#71717a" fontSize={8} fontFamily={FONT}>
        {node.subtitle}
      </text>
      {node.inner ? (
        <g>
          <rect x={node.x + CARD_WIDTH - 28} y={node.y - 8} width={24} height={15} rx={7.5} fill="#5963fa" />
          <text
            x={node.x + CARD_WIDTH - 16}
            y={node.y + 2.5}
            textAnchor="middle"
            fill="#fff"
            fontSize={8}
            fontWeight={600}
            fontFamily={FONT}
          >
            {node.inner}
          </text>
        </g>
      ) : null}
    </g>
  );
}

function PreviewCursor({
  className,
  x,
  y,
  name,
  color,
}: {
  className: string;
  x: number;
  y: number;
  name: string;
  color: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={className}>
        <MousePointer2 x={0} y={0} width={16} height={16} color={color} fill={color} strokeWidth={1.5} />
        <rect x={14} y={14} width={name.length * 6 + 12} height={16} rx={8} fill={color} />
        <text x={20} y={25} fill="#0b0b0d" fontSize={9} fontWeight={600} fontFamily={FONT}>
          {name}
        </text>
      </g>
    </g>
  );
}
