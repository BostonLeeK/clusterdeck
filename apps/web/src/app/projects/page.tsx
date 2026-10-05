import { listProjects, listWorkspaces } from "@/lib/queries";
import { auth } from "@/lib/auth";
import { ProjectsShell } from "@/components/projects/projects-shell";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const params = await searchParams;
  const filter = (params.filter === "personal" || params.filter === "shared" || params.filter === "trash"
    ? params.filter
    : "all") as "all" | "personal" | "shared" | "trash";
  const [projects, workspaces] = await Promise.all([
    listProjects({
      userId: session.user.id,
      filter,
      query: typeof params.q === "string" ? params.q : undefined,
      sort: params.sort === "name" ? "name" : "updated",
    }),
    listWorkspaces(session.user.id),
  ]);

  return (
    <ProjectsShell
      user={session.user}
      workspaces={workspaces}
      projects={projects}
      filter={filter}
    />
  );
}
