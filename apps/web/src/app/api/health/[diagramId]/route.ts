import { NextResponse } from "next/server";
import { listDiagramObservations } from "@dataflow/db";
import { auth } from "@/lib/auth";
import { resolveDiagramForHealthRead, userIdFromMcpBearer } from "@/lib/health-auth";

type RouteProps = {
  params: Promise<{ diagramId: string }>;
};

export async function GET(request: Request, { params }: RouteProps) {
  const { diagramId } = await params;
  const mcpUserId = await userIdFromMcpBearer(request.headers.get("authorization"));
  const session = mcpUserId ? null : await auth();
  const userId = mcpUserId ?? session?.user?.id;

  const diagram = await resolveDiagramForHealthRead(diagramId, userId);
  if (!diagram) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const rows = await listDiagramObservations(diagramId);
  return NextResponse.json({
    diagramId,
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
