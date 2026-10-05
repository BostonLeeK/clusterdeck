import { listProjects, listWorkspaces, requireUser } from "@/lib/queries";
import { ProjectsShell } from "@/components/projects/projects-shell";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const user = await requireUser();
  const params = await searchParams;
  const filter = (params.filter === "personal" || params.filter === "shared" || params.filter === "trash"
    ? params.filter
    : "all") as "all" | "personal" | "shared" | "trash";
  const [projects, workspaces] = await Promise.all([
    listProjects({
      userId: user.id,
      filter,
      query: typeof params.q === "string" ? params.q : undefined,
      sort: params.sort === "name" ? "name" : "updated",
    }),
    listWorkspaces(user.id),
  ]);

  return (
    <ProjectsShell
      user={user}
      workspaces={workspaces}
      projects={projects}
      filter={filter}
    />
  );
}
