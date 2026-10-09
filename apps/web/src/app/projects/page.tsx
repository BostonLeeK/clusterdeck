import {
  listAccessibleTemplates,
  listProjects,
  listWorkspaceMembers,
  listWorkspaces,
  requireUser,
} from "@/lib/queries";
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
  const [projects, team, userTemplates] = await Promise.all([
    listProjects({
      userId: user.id,
      filter: filter === "templates" ? "all" : filter,
      query: typeof params.q === "string" ? params.q : undefined,
      sort: params.sort === "name" ? "name" : "updated",
      workspaceId: filter === "team" ? workspaceId : undefined,
    }),
    workspaceId ? listWorkspaceMembers(workspaceId, user.id) : Promise.resolve(null),
    listAccessibleTemplates(user.id),
  ]);

  return (
    <ProjectsShell
      user={user}
      workspaces={workspaces}
      projects={projects}
      userTemplates={userTemplates}
      filter={filter}
      workspaceId={workspaceId}
      team={
        team && workspaceId
          ? {
              workspaceId,
              role: team.role,
              members: team.members,
              invites: team.invites.map((invite) => ({
                id: invite.id,
                email: invite.email,
                role: invite.role,
              })),
            }
          : null
      }
    />
  );
}
