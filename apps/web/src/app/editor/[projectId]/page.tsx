import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db, diagrams } from "@dataflow/db";
import { getAccess } from "@/lib/queries";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EditorIndex({ params }: PageProps<"/editor/[projectId]">) {
  const session = await auth();
  const { projectId } = await params;
  const access = await getAccess(projectId, session?.user?.id);
  if (!access) redirect("/projects");
  const [root] = await db
    .select()
    .from(diagrams)
    .where(and(eq(diagrams.projectId, projectId), isNull(diagrams.parentDiagramId)))
    .limit(1);
  if (!root) redirect("/projects");
  redirect(`/editor/${projectId}/${root.id}`);
}
