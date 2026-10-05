import { appBaseUrl } from "@/lib/email";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function brandMark(size = 36) {
  const src = `${appBaseUrl()}/brand/mark.png`;
  return `<img src="${escapeHtml(src)}" width="${size}" height="${size}" alt="ClusterDeck" style="display:block;width:${size}px;height:${size}px;border:0;border-radius:8px;" />`;
}

function brandLockup(size: "sm" | "md" = "md") {
  const mark = size === "sm" ? 28 : 36;
  const nameSize = size === "sm" ? "16px" : "20px";
  const tagSize = size === "sm" ? "9px" : "10px";
  return `<table role="presentation" cellspacing="0" cellpadding="0">
  <tr>
    <td style="vertical-align:middle;">${brandMark(mark)}</td>
    <td style="padding-left:12px;vertical-align:middle;">
      <div style="font-size:${nameSize};font-weight:700;letter-spacing:-0.03em;color:#ffffff;line-height:1.1;">ClusterDeck</div>
      <div style="margin-top:4px;font-size:${tagSize};font-weight:600;letter-spacing:0.14em;color:#71717a;text-transform:uppercase;">Visual infrastructure</div>
    </td>
  </tr>
</table>`;
}

function button(href: string, label: string) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;line-height:1;padding:14px 22px;border-radius:12px;">${escapeHtml(label)}</a>`;
}

function featureIcon(kind: "layers" | "bolt" | "grid") {
  if (kind === "layers") {
    return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3 3 8l9 5 9-5-9-5Z" stroke="#3b82f6" stroke-width="1.6" stroke-linejoin="round"/><path d="m3 12 9 5 9-5" stroke="#3b82f6" stroke-width="1.6" stroke-linejoin="round"/><path d="m3 16 9 5 9-5" stroke="#3b82f6" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  }
  if (kind === "bolt") {
    return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 2 4 14h7l-1 8 10-14h-7l0-6Z" stroke="#3b82f6" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  }
  return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="8" height="8" rx="2" stroke="#3b82f6" stroke-width="1.6"/><rect x="13" y="3" width="8" height="8" rx="2" stroke="#3b82f6" stroke-width="1.6"/><rect x="3" y="13" width="8" height="8" rx="2" stroke="#3b82f6" stroke-width="1.6"/><rect x="13" y="13" width="8" height="8" rx="2" stroke="#3b82f6" stroke-width="1.6"/></svg>`;
}

function featureCell(kind: "layers" | "bolt" | "grid", title: string, text: string) {
  return `<td width="33.33%" valign="top" style="padding:8px 10px;">
  <div style="margin-bottom:10px;">${featureIcon(kind)}</div>
  <div style="font-size:15px;font-weight:700;color:#f8fafc;margin-bottom:6px;">${escapeHtml(title)}</div>
  <div style="font-size:13px;line-height:1.5;color:#a1a1aa;">${escapeHtml(text)}</div>
</td>`;
}

function nodeChip(label: string) {
  return `<span style="display:inline-block;margin:4px;padding:8px 12px;background:#12141c;border:1px solid #2a3348;border-radius:10px;color:#e4e4e7;font-size:11px;font-weight:600;">${escapeHtml(label)}</span>`;
}

function productPreview() {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0 8px;">
  <tr>
    <td style="background:#0b0d12;border:1px solid #1e2433;border-radius:16px;overflow:hidden;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td width="96" valign="top" style="background:#0e1016;border-right:1px solid #1e2433;padding:16px 12px;color:#71717a;font-size:11px;line-height:1.9;">
            <div style="color:#e4e4e7;font-weight:700;margin-bottom:10px;">Workspace</div>
            Nodes<br />Clusters<br />Deployments<br />Network<br />Settings
          </td>
          <td valign="middle" style="padding:20px 16px;background:radial-gradient(circle at 28% 18%,#13203a 0%,#0b0d12 58%);">
            <div style="text-align:center;margin-bottom:10px;">
              ${nodeChip("api-gateway")}
              ${nodeChip("auth")}
            </div>
            <div style="text-align:center;color:#3b82f6;font-size:14px;line-height:1;margin:2px 0 8px;">↓</div>
            <div style="text-align:center;margin-bottom:10px;">
              ${nodeChip("worker")}
            </div>
            <div style="text-align:center;color:#60a5fa;font-size:14px;line-height:1;margin:2px 0 8px;">↓</div>
            <div style="text-align:center;">
              ${nodeChip("database")}
              ${nodeChip("redis")}
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

function featuresBlock() {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0 8px;">
  <tr>
    ${featureCell("layers", "Clear view", "See your infrastructure as a single map.")}
    ${featureCell("bolt", "Faster decisions", "Find issues and dependencies instantly.")}
    ${featureCell("grid", "Built for real teams", "Simple, powerful and flexible.")}
  </tr>
</table>`;
}

function layout({
  title,
  preview,
  headline,
  accent,
  subtitle,
  body,
  ctaHref,
  ctaLabel,
  showPreview = true,
  showFeatures = true,
  footerNote,
}: {
  title: string;
  preview: string;
  headline: string;
  accent: string;
  subtitle?: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
  showPreview?: boolean;
  showFeatures?: boolean;
  footerNote: string;
}) {
  const base = appBaseUrl();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#050505;color:#e4e4e7;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preview)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050505;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#0a0a0a;border:1px solid #1a1a1f;border-radius:20px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">${brandLockup("md")}</td>
                  <td align="right" style="vertical-align:middle;">
                    <a href="${escapeHtml(base)}" style="color:#71717a;font-size:12px;text-decoration:none;">View in browser →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;">
              <h1 style="margin:0 0 12px;font-size:34px;line-height:1.15;letter-spacing:-0.04em;font-weight:700;color:#ffffff;">
                ${escapeHtml(headline)} <span style="color:#3b82f6;">${escapeHtml(accent)}</span>
              </h1>
              ${
                subtitle
                  ? `<p style="margin:0 0 18px;font-size:16px;line-height:1.5;color:#a1a1aa;">${escapeHtml(subtitle)}</p>`
                  : ""
              }
              <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#d4d4d8;">${body}</p>
              <div style="margin:0 0 8px;">${button(ctaHref, ctaLabel)}</div>
              ${showPreview ? productPreview() : ""}
              ${showFeatures ? featuresBlock() : ""}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 28px;border-top:1px solid #1a1a1f;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="vertical-align:middle;padding-bottom:18px;">${brandLockup("sm")}</td>
                  <td align="right" style="vertical-align:middle;padding-bottom:18px;font-size:13px;">
                    <a href="${escapeHtml(base)}" style="color:#a1a1aa;text-decoration:none;margin-left:14px;">Docs</a>
                    <a href="${escapeHtml(base)}" style="color:#a1a1aa;text-decoration:none;margin-left:14px;">Support</a>
                    <a href="${escapeHtml(base)}/sign-in" style="color:#a1a1aa;text-decoration:none;margin-left:14px;">Login</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#71717a;">${escapeHtml(footerNote)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function verificationEmailHtml({ name, verifyUrl }: { name: string; verifyUrl: string }) {
  return layout({
    title: "Welcome to ClusterDeck",
    preview: "Confirm your ClusterDeck email and start mapping infrastructure.",
    headline: "Welcome to",
    accent: "ClusterDeck",
    subtitle: "Visualize. Organize. Understand your infrastructure.",
    body: `Hi ${escapeHtml(name)}, your ClusterDeck account has been created. Confirm your email to activate it and start visualizing your infrastructure.`,
    ctaHref: verifyUrl,
    ctaLabel: "Confirm email →",
    footerNote:
      "You’re receiving this email because you created a ClusterDeck account. If you didn’t request this, you can safely ignore this email.",
  });
}

export function passwordResetEmailHtml({ name, resetUrl }: { name: string; resetUrl: string }) {
  return layout({
    title: "Reset your ClusterDeck password",
    preview: "Reset your ClusterDeck password with this secure link.",
    headline: "Reset your",
    accent: "password",
    subtitle: "Choose a new password to get back into your workspace.",
    body: `Hi ${escapeHtml(name || "there")}, we received a request to reset your ClusterDeck password. This link expires in 1 hour.`,
    ctaHref: resetUrl,
    ctaLabel: "Choose a new password →",
    showPreview: false,
    showFeatures: false,
    footerNote:
      "You’re receiving this email because a password reset was requested for your ClusterDeck account. If you didn’t request this, you can safely ignore this email.",
  });
}

export function projectInviteEmailHtml({
  inviterName,
  projectName,
  role,
  actionUrl,
  existingUser,
}: {
  inviterName: string;
  projectName: string;
  role: string;
  actionUrl: string;
  existingUser: boolean;
}) {
  return layout({
    title: `Invite to ${projectName}`,
    preview: `${inviterName} invited you to collaborate on ${projectName}.`,
    headline: "You're invited to",
    accent: projectName,
    subtitle: "Collaborate on infrastructure diagrams with your team.",
    body: `${escapeHtml(inviterName)} invited you to <strong style="color:#ffffff;">${escapeHtml(projectName)}</strong> as <strong style="color:#ffffff;">${escapeHtml(role)}</strong>. ${
      existingUser
        ? "Open the project to start collaborating."
        : "Create an account with this email to accept the invite."
    }`,
    ctaHref: actionUrl,
    ctaLabel: existingUser ? "Open project →" : "Accept invite →",
    showPreview: true,
    showFeatures: false,
    footerNote:
      "You’re receiving this email because someone invited you to a ClusterDeck project. If you weren’t expecting this, you can safely ignore this email.",
  });
}
