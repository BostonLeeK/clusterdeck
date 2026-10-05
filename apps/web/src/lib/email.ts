import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export function emailConfigured() {
  return Boolean(resend && process.env.EMAIL_FROM);
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resend) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  const from = process.env.EMAIL_FROM ?? "ClusterDeck <noreply@clusterdeck.space>";
  const result = await resend.emails.send({ from, to, subject, html });
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.data;
}

export function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
