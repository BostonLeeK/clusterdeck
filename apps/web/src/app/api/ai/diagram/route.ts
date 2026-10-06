import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  applyEditsToSnapshot,
  canEdit,
  diagramAgentInstructions,
  type DiagramEdits,
  type DiagramSnapshot,
} from "@dataflow/shared";
import { loadUserOpenAiApiKey } from "@/lib/ai-credentials";
import { auth } from "@/lib/auth";
import { getAccess, getDiagramWithTrail } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatTurn = { role: "user" | "assistant"; content: string };

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_diagram",
      description: "Read the current diagram snapshot (nodes, edges, meta).",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "update_diagram",
      description:
        "Create, update, or delete nodes and edges. Prefer small focused edits. New nodes need position and typeId for infra.",
      parameters: {
        type: "object",
        properties: {
          upsertNodes: { type: "array", items: { type: "object", additionalProperties: true } },
          deleteNodeIds: { type: "array", items: { type: "string" } },
          upsertEdges: { type: "array", items: { type: "object", additionalProperties: true } },
          deleteEdgeIds: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    },
  },
];

function encode(event: Record<string, unknown>) {
  return `${JSON.stringify(event)}\n`;
}

function compactSnapshot(snapshot: DiagramSnapshot) {
  return {
    nodes: snapshot.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      parentId: node.parentId,
      width: node.width,
      height: node.height,
      data: node.data,
    })),
    edges: snapshot.edges,
    meta: snapshot.meta,
  };
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { diagramId?: string; messages?: ChatTurn[]; snapshot?: DiagramSnapshot };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const diagramId = body.diagramId?.trim();
  if (!diagramId) return NextResponse.json({ error: "diagramId is required" }, { status: 400 });
  if (!body.snapshot) return NextResponse.json({ error: "snapshot is required" }, { status: 400 });
  const messages = (body.messages ?? []).filter(
    (item) => (item.role === "user" || item.role === "assistant") && item.content.trim(),
  );
  if (!messages.length) return NextResponse.json({ error: "messages are required" }, { status: 400 });

  const trail = await getDiagramWithTrail(diagramId);
  if (!trail) return NextResponse.json({ error: "Diagram not found" }, { status: 404 });
  const access = await getAccess(trail.diagram.projectId, userId);
  if (!access || !canEdit(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apiKey = await loadUserOpenAiApiKey(userId);
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API key is not configured" }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey });
  let working = body.snapshot;
  const pendingEdits: DiagramEdits[] = [];
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => controller.enqueue(encoder.encode(encode(event)));
      try {
        const conversation: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
          {
            role: "system",
            content: [
              "You are ClusterDeck's in-editor architecture assistant.",
              "Help the user understand and edit the current infrastructure diagram.",
              "Use tools to read and update the diagram when needed.",
              "After edits, briefly confirm what changed.",
              "",
              diagramAgentInstructions(),
            ].join("\n"),
          },
          ...messages.map((item) => ({ role: item.role, content: item.content })),
        ];

        for (let round = 0; round < 6; round += 1) {
          const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: conversation,
            tools: TOOLS,
            tool_choice: "auto",
          });
          const choice = completion.choices[0]?.message;
          if (!choice) throw new Error("Empty model response");

          const toolCalls = choice.tool_calls ?? [];
          if (!toolCalls.length) {
            if (choice.content) send({ type: "text", text: choice.content });
            break;
          }

          conversation.push({
            role: "assistant",
            content: choice.content,
            tool_calls: toolCalls,
          });

          for (const call of toolCalls) {
            if (call.type !== "function") continue;
            const name = call.function.name;
            let result: unknown;
            try {
              if (name === "get_diagram") {
                result = compactSnapshot(working);
              } else if (name === "update_diagram") {
                const args = JSON.parse(call.function.arguments || "{}") as DiagramEdits;
                const applied = applyEditsToSnapshot(working, args);
                working = applied.snapshot;
                pendingEdits.push(args);
                result = {
                  ok: true,
                  upsertedNodeIds: applied.upsertedNodeIds,
                  deletedNodeIds: applied.deletedNodeIds,
                  upsertedEdgeIds: applied.upsertedEdgeIds,
                  deletedEdgeIds: applied.deletedEdgeIds,
                };
                send({
                  type: "edits",
                  edits: args,
                  summary: result,
                });
              } else {
                result = { error: `Unknown tool ${name}` };
              }
            } catch (error) {
              result = { error: error instanceof Error ? error.message : "Tool failed" };
            }
            conversation.push({
              role: "tool",
              tool_call_id: call.id,
              content: JSON.stringify(result),
            });
          }
        }

        if (pendingEdits.length) {
          send({ type: "applied", count: pendingEdits.length });
        }
        send({ type: "done" });
      } catch (error) {
        send({
          type: "error",
          error: error instanceof Error ? error.message : "AI request failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
