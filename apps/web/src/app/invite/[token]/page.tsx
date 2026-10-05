import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db, projectInvites, projectMembers } from "@dataflow/db";
import { auth } from "@/lib/auth";
import { acceptInviteByToken } from "@/lib/invites";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const [invite] = await db.select().from(projectInvites).where(eq(projectInvites.token, token)).limit(1);

  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email?.trim().toLowerCase();

  if (!userId || !email) {
    if (!invite) notFound();
    redirect(
      `/sign-in?callbackUrl=${encodeURIComponent(`/invite/${token}`)}&email=${encodeURIComponent(invite.email)}`,
    );
  }

  if (!invite) {
    redirect("/projects");
  }

  if (email === invite.email) {
    const result = await acceptInviteByToken(token, userId, email);
    if (result && "ok" in result) redirect(`/editor/${result.projectId}`);
  }

  const [member] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, invite.projectId), eq(projectMembers.userId, userId)))
    .limit(1);

  if (member) {
    redirect(`/editor/${invite.projectId}`);
  }

  redirect("/projects");
}
