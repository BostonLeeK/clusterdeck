import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export function emailConfigured() {
  return Boolean(resend && process.env.EMAIL_FROM);
}

export async function sendAlertEmail(input: {
  to: string[];
  subject: string;
  html: string;
}) {
  if (!resend) throw new Error("RESEND_API_KEY is not configured");
  const from = process.env.EMAIL_FROM ?? "ClusterDeck <noreply@clusterdeck.space>";
  for (const to of input.to) {
    const result = await resend.emails.send({ from, to, subject: input.subject, html: input.html });
    if (result.error) throw new Error(result.error.message);
  }
}

export function alertEmailHtml(input: {
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
  return `
  <div style="font-family:Inter,Segoe UI,sans-serif;background:#0b0b0d;color:#e4e4e7;padding:24px">
    <h1 style="font-size:18px;margin:0 0 12px">Health check alert</h1>
    <p style="margin:0 0 16px;color:#a1a1aa;line-height:1.5">
      <strong style="color:#f4f4f5">${escapeHtml(input.nodeTitle)}</strong>
      in <strong style="color:#f4f4f5">${escapeHtml(input.projectName)}</strong>
      / ${escapeHtml(input.diagramName)} failed
      <strong style="color:#f4f4f5">${input.failCount}</strong> times in the last
      <strong style="color:#f4f4f5">${windowMin} min</strong>.
    </p>
    <p style="margin:0 0 8px;color:#a1a1aa">Latest: ${escapeHtml(input.message)}</p>
    ${input.url ? `<p style="margin:0 0 16px;color:#71717a;font-size:13px">${escapeHtml(input.url)}</p>` : ""}
    <p style="margin:0;font-size:12px;color:#52525b">Node id: ${escapeHtml(input.nodeId)}</p>
    <p style="margin:16px 0 0">
      <a href="${escapeHtml(input.appUrl)}" style="color:#a5b4fc">Open ClusterDeck</a>
    </p>
  </div>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
