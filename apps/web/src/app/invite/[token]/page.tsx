import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, projectInvites, workspaceInvites } from "@dataflow/db";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { auth, signOut } from "@/lib/auth";
import { acceptInviteByToken } from "@/lib/invites";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const [projectInvite] = await db.select().from(projectInvites).where(eq(projectInvites.token, token)).limit(1);
  const [workspaceInvite] = projectInvite
    ? [null]
    : await db.select().from(workspaceInvites).where(eq(workspaceInvites.token, token)).limit(1);
  const invite = projectInvite ?? workspaceInvite;

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
    return (
      <AuthShell>
        <h1 className="mb-3 text-center text-[28px] font-semibold tracking-tight">Invite already used</h1>
        <p className="mb-6 text-center text-sm leading-6 text-zinc-400">
          This invite link is no longer valid. If you were added, open your projects.
        </p>
        <Link href="/projects">
          <Button className="h-11 w-full rounded-xl">Open projects</Button>
        </Link>
      </AuthShell>
    );
  }

  const result = await acceptInviteByToken(token, userId, email);
  if ("ok" in result) {
    if (result.kind === "workspace") {
      redirect(`/projects?filter=team&workspace=${result.workspaceId}`);
    }
    redirect(`/editor/${result.projectId}`);
  }

  if ("error" in result && result.error === "mismatch") {
    return (
      <AuthShell>
        <h1 className="mb-3 text-center text-[28px] font-semibold tracking-tight">Wrong account</h1>
        <p className="mb-6 text-center text-sm leading-6 text-zinc-400">
          This invite was sent to <span className="text-zinc-200">{result.invite.email}</span>, but you’re signed in as{" "}
          <span className="text-zinc-200">{email}</span>.
        </p>
        <form
          action={async () => {
            "use server";
            await signOut({
              redirectTo: `/sign-in?callbackUrl=${encodeURIComponent(`/invite/${token}`)}&email=${encodeURIComponent(result.invite.email)}`,
            });
          }}
        >
          <Button className="h-11 w-full rounded-xl" type="submit">
            Sign in with the invited email
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-500">
          <Link className="text-indigo-400 hover:text-indigo-300" href="/projects">
            Back to projects
          </Link>
        </p>
      </AuthShell>
    );
  }

  redirect("/projects");
}
