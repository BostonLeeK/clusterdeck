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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function brandLockup() {
  const src = `${appBaseUrl()}/brand/mark-email.png`;
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0">
  <tr>
    <td style="vertical-align:middle;padding:0;">
      <img src="${escapeHtml(src)}" width="34" height="40" alt="ClusterDeck" style="display:block;width:34px;height:40px;border:0;" />
    </td>
    <td style="vertical-align:middle;padding:0 0 0 12px;">
      <div style="font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:18px;font-weight:700;letter-spacing:-0.03em;color:#ffffff;line-height:1.05;">ClusterDeck</div>
      <div style="font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;margin-top:4px;font-size:10px;font-weight:600;letter-spacing:0.14em;color:#8b8b93;text-transform:uppercase;">Health alert</div>
    </td>
  </tr>
</table>`;
}

function detailRow(label: string, valueHtml: string, last = false) {
  return `<tr>
  <td style="padding:12px 0 ${last ? "0" : "12px"};border-bottom:${last ? "0" : "1px solid #23232a"};width:34%;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#8b8b93;vertical-align:top;">
    ${escapeHtml(label)}
  </td>
  <td style="padding:12px 0 ${last ? "0" : "12px"};border-bottom:${last ? "0" : "1px solid #23232a"};font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.45;color:#f4f4f5;vertical-align:top;word-break:break-word;">
    ${valueHtml}
  </td>
</tr>`;
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
  const preview = `${input.nodeTitle} failed ${input.failCount} times in ${windowMin} min`;
  const targetHtml = input.url
    ? `<a href="${escapeHtml(input.url)}" style="color:#93c5fd;text-decoration:none;word-break:break-all;">${escapeHtml(input.url)}</a>`
    : `<span style="color:#a1a1aa;">—</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark only" />
  <meta name="supported-color-schemes" content="dark" />
  <title>Health check alert</title>
</head>
<body style="margin:0;padding:0;background:#000000;color:#e4e4e7;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${escapeHtml(preview)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#000000;">
    <tr>
      <td align="center" style="padding:36px 14px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#0b0b0d;border:1px solid #1c1c22;border-radius:22px;">
          <tr>
            <td style="padding:28px 32px 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">${brandLockup()}</td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;padding:7px 12px;border-radius:999px;background:rgba(248,113,113,0.14);border:1px solid rgba(248,113,113,0.45);font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;color:#fecaca;text-transform:uppercase;">Offline</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 8px;">
              <div style="height:1px;background:linear-gradient(90deg,rgba(248,113,113,0.55),rgba(248,113,113,0.08));"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 6px;">
              <div style="font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:26px;font-weight:700;letter-spacing:-0.03em;color:#ffffff;line-height:1.2;margin:0 0 10px;">
                ${escapeHtml(input.nodeTitle)} is unhealthy
              </div>
              <div style="font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#a1a1aa;margin:0;">
                Failed <strong style="color:#f4f4f5;">${input.failCount}</strong> times in the last
                <strong style="color:#f4f4f5;">${windowMin} min</strong>
                in <strong style="color:#f4f4f5;">${escapeHtml(input.projectName)}</strong>
                / ${escapeHtml(input.diagramName)}.
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#121214;border:1px solid #23232a;border-radius:16px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      ${detailRow("Latest error", escapeHtml(input.message))}
                      ${detailRow("Target", targetHtml)}
                      ${detailRow("Node", `<code style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;color:#d4d4d8;">${escapeHtml(input.nodeId)}</code>`, true)}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 32px 10px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="border-radius:12px;background:#ef4444;">
                    <a href="${escapeHtml(input.appUrl)}" style="display:inline-block;padding:14px 22px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;line-height:1;color:#ffffff;text-decoration:none;border-radius:12px;">Open diagram →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 28px;">
              <div style="font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#71717a;">
                You’re receiving this because alerts are enabled for this node in ClusterDeck.
                Failures clear automatically when the next probe succeeds.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
