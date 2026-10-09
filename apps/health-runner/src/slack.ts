export async function sendSlackAlert(input: {
  webhookUrl: string;
  projectName: string;
  diagramName: string;
  nodeTitle: string;
  nodeId: string;
  message: string;
  failCount: number;
  windowSec: number;
  url?: string;
  appUrl: string;
}) {
  const windowMin = Math.max(1, Math.round(input.windowSec / 60));
  const lines = [
    `*Health check alert*`,
    `*${input.nodeTitle}* in *${input.projectName}* / ${input.diagramName}`,
    `Failed *${input.failCount}* times in the last *${windowMin} min*.`,
    `Latest: ${input.message}`,
  ];
  if (input.url) lines.push(`Target: \`${input.url}\``);
  lines.push(`Node id: \`${input.nodeId}\``);
  lines.push(`<${input.appUrl}|Open in ClusterDeck>`);

  const response = await fetch(input.webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: lines.join("\n") }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`slack webhook ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }
}
