import { appBaseUrl } from "@/lib/email";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function brandMark(height = 40) {
  const width = Math.round(height * (111 / 128));
  const src = `${appBaseUrl()}/brand/mark-email.png`;
  return `<img src="${escapeHtml(src)}" width="${width}" height="${height}" alt="ClusterDeck" style="display:block;width:${width}px;height:${height}px;border:0;outline:none;text-decoration:none;" />`;
}

function brandLockup(size: "sm" | "md" = "md") {
  const markH = size === "sm" ? 32 : 42;
  const nameSize = size === "sm" ? "18px" : "22px";
  const tagSize = size === "sm" ? "9px" : "10px";
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0">
  <tr>
    <td style="vertical-align:middle;padding:0;">${brandMark(markH)}</td>
    <td style="vertical-align:middle;padding:0 0 0 14px;">
      <div style="font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:${nameSize};font-weight:700;letter-spacing:-0.03em;color:#ffffff;line-height:1.05;">ClusterDeck</div>
      <div style="font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;margin-top:5px;font-size:${tagSize};font-weight:600;letter-spacing:0.16em;color:#8b8b93;text-transform:uppercase;line-height:1;">Visual infrastructure</div>
    </td>
  </tr>
</table>`;
}

function button(href: string, label: string) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="border-radius:12px;background:#3b82f6;">
  <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 22px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;line-height:1;color:#ffffff;text-decoration:none;border-radius:12px;">${escapeHtml(label)}</a>
</td></tr></table>`;
}

function featureIcon(kind: "layers" | "bolt" | "grid") {
  if (kind === "layers") {
    return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3 3 8l9 5 9-5-9-5Z" stroke="#3b82f6" stroke-width="1.7" stroke-linejoin="round"/><path d="m3 12 9 5 9-5" stroke="#3b82f6" stroke-width="1.7" stroke-linejoin="round"/><path d="m3 16 9 5 9-5" stroke="#3b82f6" stroke-width="1.7" stroke-linejoin="round"/></svg>`;
  }
  if (kind === "bolt") {
    return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 2 4 14h7l-1 8 10-14h-7V2Z" stroke="#3b82f6" stroke-width="1.7" stroke-linejoin="round"/></svg>`;
  }
  return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3.5" y="3.5" width="7" height="7" rx="1.8" stroke="#3b82f6" stroke-width="1.7"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8" stroke="#3b82f6" stroke-width="1.7"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8" stroke="#3b82f6" stroke-width="1.7"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8" stroke="#3b82f6" stroke-width="1.7"/></svg>`;
}

function featureCell(kind: "layers" | "bolt" | "grid", title: string, text: string, padRight: boolean) {
  return `<td width="33.33%" valign="top" style="padding:4px ${padRight ? "18px" : "0"} 4px 0;">
  <div style="margin-bottom:12px;line-height:0;">${featureIcon(kind)}</div>
  <div style="font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#f4f4f5;margin:0 0 6px;">${escapeHtml(title)}</div>
  <div style="font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:#9ca3af;">${escapeHtml(text)}</div>
</td>`;
}

function productPreview() {
  const src = `${appBaseUrl()}/brand/email-preview.jpg`;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 4px;">
  <tr>
    <td style="background:#05070d;border:1px solid #222833;border-radius:16px;overflow:hidden;padding:0;line-height:0;">
      <img src="${escapeHtml(src)}" width="520" alt="ClusterDeck editor" style="display:block;width:100%;max-width:520px;height:auto;border:0;outline:none;text-decoration:none;" />
    </td>
  </tr>
</table>`;
}

function featuresBlock() {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:32px 0 8px;">
  <tr>
    ${featureCell("layers", "Clear view", "See your infrastructure as a single map.", true)}
    ${featureCell("bolt", "Faster decisions", "Find issues and dependencies instantly.", true)}
    ${featureCell("grid", "Built for real teams", "Simple, powerful and flexible.", false)}
  </tr>
</table>`;
}

function layout({
  title,
  preview,
  headlineHtml,
  subtitle,
  bodyHtml,
  ctaHref,
  ctaLabel,
  showPreview = true,
  showFeatures = true,
  footerNote,
}: {
  title: string;
  preview: string;
  headlineHtml: string;
  subtitle?: string;
  bodyHtml: string;
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
  <meta name="color-scheme" content="dark only" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#000000;color:#e4e4e7;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${escapeHtml(preview)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#000000;">
    <tr>
      <td align="center" style="padding:36px 14px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#0b0b0d;border:1px solid #1c1c22;border-radius:22px;">
          <tr>
            <td style="padding:30px 36px 10px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">${brandLockup("md")}</td>
                  <td align="right" style="vertical-align:middle;white-space:nowrap;">
                    <a href="${escapeHtml(base)}" style="font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#8b8b93;font-size:12px;text-decoration:none;">View in browser →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 36px 10px;">
              <h1 style="margin:0 0 14px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:36px;line-height:1.12;letter-spacing:-0.04em;font-weight:700;color:#ffffff;">
                ${headlineHtml}
              </h1>
              ${
                subtitle
                  ? `<p style="margin:0 0 18px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#9ca3af;">${escapeHtml(subtitle)}</p>`
                  : ""
              }
              <p style="margin:0 0 26px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#c4c4cc;">${bodyHtml}</p>
              ${button(ctaHref, ctaLabel)}
              ${showPreview ? productPreview() : ""}
              ${showFeatures ? featuresBlock() : ""}
            </td>
          </tr>
          <tr>
            <td style="padding:28px 36px 32px;border-top:1px solid #1c1c22;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="vertical-align:middle;padding-bottom:18px;">${brandLockup("sm")}</td>
                  <td align="right" style="vertical-align:middle;padding-bottom:18px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;white-space:nowrap;">
                    <a href="${escapeHtml(base)}/docs" style="color:#a1a1aa;text-decoration:none;">Docs</a>
                    <span style="color:#3f3f46;">&nbsp;&nbsp;&nbsp;</span>
                    <a href="${escapeHtml(base)}/support" style="color:#a1a1aa;text-decoration:none;">Support</a>
                    <span style="color:#3f3f46;">&nbsp;&nbsp;&nbsp;</span>
                    <a href="${escapeHtml(base)}/sign-in" style="color:#a1a1aa;text-decoration:none;">Login</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#71717a;">${escapeHtml(footerNote)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function accentWord(text: string) {
  return `<span style="color:#3b82f6;">${escapeHtml(text)}</span>`;
}

export function verificationEmailHtml({ name, verifyUrl }: { name: string; verifyUrl: string }) {
  return layout({
    title: "Welcome to ClusterDeck",
    preview: "Confirm your ClusterDeck email and start mapping infrastructure.",
    headlineHtml: `Welcome to ${accentWord("ClusterDeck")}`,
    subtitle: "Visualize. Organize. Understand your infrastructure.",
    bodyHtml: `Hi ${escapeHtml(name)}, your ClusterDeck account has been created. Confirm your email to activate it and start visualizing your infrastructure.`,
    ctaHref: verifyUrl,
    ctaLabel: "Confirm email →",
    showPreview: true,
    showFeatures: true,
    footerNote:
      "You’re receiving this email because you created a ClusterDeck account. If you didn’t request this, you can safely ignore this email.",
  });
}

export function passwordResetEmailHtml({ name, resetUrl }: { name: string; resetUrl: string }) {
  return layout({
    title: "Reset your ClusterDeck password",
    preview: "Reset your ClusterDeck password with this secure link.",
    headlineHtml: `Reset your ${accentWord("password")}`,
    subtitle: "Choose a new password to get back into your workspace.",
    bodyHtml: `Hi ${escapeHtml(name || "there")}, we received a request to reset your ClusterDeck password. This link expires in 1 hour.`,
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
    headlineHtml: `You're invited to ${accentWord(projectName)}`,
    subtitle: "Collaborate on infrastructure diagrams with your team.",
    bodyHtml: `${escapeHtml(inviterName)} invited you to <strong style="color:#ffffff;font-weight:700;">${escapeHtml(projectName)}</strong> as <strong style="color:#ffffff;font-weight:700;">${escapeHtml(role)}</strong>. ${
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

export function workspaceInviteEmailHtml({
  inviterName,
  teamName,
  role,
  actionUrl,
  existingUser,
}: {
  inviterName: string;
  teamName: string;
  role: string;
  actionUrl: string;
  existingUser: boolean;
}) {
  return layout({
    title: `Invite to ${teamName}`,
    preview: `${inviterName} invited you to join ${teamName} on ClusterDeck.`,
    headlineHtml: `Join ${accentWord(teamName)}`,
    subtitle: "Collaborate on your team’s infrastructure diagrams.",
    bodyHtml: `${escapeHtml(inviterName)} invited you to the team <strong style="color:#ffffff;font-weight:700;">${escapeHtml(teamName)}</strong> as <strong style="color:#ffffff;font-weight:700;">${escapeHtml(role)}</strong>. ${
      existingUser
        ? "Open Team projects to start collaborating."
        : "Create an account with this email to accept the invite."
    }`,
    ctaHref: actionUrl,
    ctaLabel: existingUser ? "Open team →" : "Accept invite →",
    showPreview: true,
    showFeatures: false,
    footerNote:
      "You’re receiving this email because someone invited you to a ClusterDeck team. If you weren’t expecting this, you can safely ignore this email.",
  });
}
