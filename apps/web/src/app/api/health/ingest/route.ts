import { NextResponse } from "next/server";
import { upsertNodeObservations, type ObservationStatus } from "@dataflow/db";
import { resolveDiagramForHealthIngest, userIdFromMcpBearer } from "@/lib/health-auth";

const STATUSES = new Set<ObservationStatus>(["healthy", "degraded", "unknown", "offline"]);

type ObservationBody = {
  nodeId?: string;
  status?: string;
  message?: string | null;
  source?: string;
  staleAfterSec?: number;
  checkedAt?: string;
};

function parseItems(body: unknown): { diagramId: string; items: ObservationBody[] } | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const diagramId = typeof record.diagramId === "string" ? record.diagramId.trim() : "";
  if (!diagramId) return null;

  if (Array.isArray(record.observations)) {
    return { diagramId, items: record.observations as ObservationBody[] };
  }
  if (typeof record.nodeId === "string") {
    return { diagramId, items: [record as ObservationBody] };
  }
  return null;
}

export async function POST(request: Request) {
  const userId = await userIdFromMcpBearer(request.headers.get("authorization"));
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = parseItems(body);
  if (!parsed?.items.length) {
    return NextResponse.json({ error: "diagramId and observations required" }, { status: 400 });
  }

  const diagram = await resolveDiagramForHealthIngest(parsed.diagramId, userId);
  if (!diagram) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const inputs = [];
  for (const item of parsed.items.slice(0, 200)) {
    const nodeId = item.nodeId?.trim();
    const status = item.status as ObservationStatus | undefined;
    if (!nodeId || !status || !STATUSES.has(status)) {
      return NextResponse.json({ error: "each observation needs nodeId and valid status" }, { status: 400 });
    }
    const checkedAt = item.checkedAt ? new Date(item.checkedAt) : undefined;
    if (checkedAt && Number.isNaN(checkedAt.getTime())) {
      return NextResponse.json({ error: "invalid checkedAt" }, { status: 400 });
    }
    inputs.push({
      diagramId: diagram.diagramId,
      nodeId,
      status,
      message: item.message,
      source: item.source?.trim() || "webhook",
      staleAfterSec: item.staleAfterSec,
      checkedAt,
    });
  }

  const rows = await upsertNodeObservations(inputs);
  return NextResponse.json({
    ok: true,
    count: rows.length,
    observations: rows.map((row) => ({
      nodeId: row.nodeId,
      status: row.status,
      checkedAt: row.checkedAt.toISOString(),
      source: row.source,
      message: row.message,
      staleAfterSec: row.staleAfterSec,
    })),
  });
}
