import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";

type ResendEvent = {
  type?: string;
  data?: { email_id?: string };
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  const forwardTo = process.env.EMAIL_FORWARD_TO?.trim();
  const forwardFrom =
    process.env.EMAIL_INBOUND_FROM?.trim() ||
    process.env.EMAIL_FROM?.replace(/^.*<([^>]+)>.*$/, "$1").trim() ||
    "noreply@clusterdeck.space";

  if (!apiKey || !forwardTo) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  let event: ResendEvent;
  try {
    event = (await request.json()) as ResendEvent;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (event.type !== "email.received" || !event.data?.email_id) {
    return NextResponse.json({ ok: true });
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.receiving.forward({
    emailId: event.data.email_id,
    to: forwardTo,
    from: forwardFrom.includes("<") ? forwardFrom : `ClusterDeck <${forwardFrom}>`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
