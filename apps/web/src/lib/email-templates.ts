function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function layout({
  title,
  preview,
  body,
}: {
  title: string;
  preview: string;
  body: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#07070a;color:#e4e4e7;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#07070a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#0f1117;border:1px solid #1e2433;border-radius:20px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 12px;background:linear-gradient(180deg,#12203a 0%,#0f1117 100%);">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width:36px;height:36px;border-radius:10px;background:#1d4ed8;color:#fff;font-weight:700;font-size:14px;text-align:center;line-height:36px;">CD</td>
                  <td style="padding-left:12px;font-size:18px;font-weight:650;letter-spacing:-0.02em;color:#f8fafc;">ClusterDeck</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 32px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;color:#71717a;font-size:12px;line-height:1.5;">
              If you didn’t request this, you can ignore this email.<br />
              © ClusterDeck · clusterdeck.space
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(href: string, label: string) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 18px;border-radius:12px;">${escapeHtml(label)}</a>`;
}

export function verificationEmailHtml({ name, verifyUrl }: { name: string; verifyUrl: string }) {
  return layout({
    title: "Confirm your email",
    preview: "Confirm your ClusterDeck email to start mapping infrastructure.",
    body: `
      <h1 style="margin:16px 0 12px;font-size:28px;line-height:1.15;letter-spacing:-0.03em;color:#f8fafc;">Confirm your email</h1>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#a1a1aa;">
        Hi ${escapeHtml(name)}, welcome to ClusterDeck. Confirm your email to activate your account and open your projects.
      </p>
      <div style="margin:24px 0;">${button(verifyUrl, "Confirm email")}</div>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#71717a;">
        Or paste this link into your browser:<br />
        <a href="${escapeHtml(verifyUrl)}" style="color:#60a5fa;word-break:break-all;">${escapeHtml(verifyUrl)}</a>
      </p>
    `,
  });
}

export function passwordResetEmailHtml({ name, resetUrl }: { name: string; resetUrl: string }) {
  return layout({
    title: "Reset your password",
    preview: "Reset your ClusterDeck password with this secure link.",
    body: `
      <h1 style="margin:16px 0 12px;font-size:28px;line-height:1.15;letter-spacing:-0.03em;color:#f8fafc;">Reset your password</h1>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#a1a1aa;">
        Hi ${escapeHtml(name || "there")}, we received a request to reset your ClusterDeck password. This link expires in 1 hour.
      </p>
      <div style="margin:24px 0;">${button(resetUrl, "Choose a new password")}</div>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#71717a;">
        Or paste this link into your browser:<br />
        <a href="${escapeHtml(resetUrl)}" style="color:#60a5fa;word-break:break-all;">${escapeHtml(resetUrl)}</a>
      </p>
    `,
  });
}
