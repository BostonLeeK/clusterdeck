import { listProjects, listWorkspaces, requireUser } from "@/lib/queries";
import { ProjectsShell } from "@/components/projects/projects-shell";

export const dynamic = "force-dynamic";

const FILTERS = ["all", "personal", "shared", "team", "trash", "templates"] as const;
type Filter = (typeof FILTERS)[number];

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const user = await requireUser();
  const params = await searchParams;
  const filter = (FILTERS.includes(params.filter as Filter) ? params.filter : "all") as Filter;
  const workspaces = await listWorkspaces(user.id);
  const workspaceId =
    (typeof params.workspace === "string" ? params.workspace : undefined) ?? workspaces[0]?.id;
  const projects = await listProjects({
    userId: user.id,
    filter: filter === "templates" ? "all" : filter,
    query: typeof params.q === "string" ? params.q : undefined,
    sort: params.sort === "name" ? "name" : "updated",
    workspaceId: filter === "team" ? workspaceId : undefined,
  });

  return (
    <ProjectsShell
      user={user}
      workspaces={workspaces}
      projects={projects}
      filter={filter}
      workspaceId={workspaceId}
    />
  );
}
