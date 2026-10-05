"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  FileText,
  Folder,
  LayoutGrid,
  List,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { logout, updateProfileName } from "@/actions/auth";
import { deleteProjectForever, restoreProject, trashProject } from "@/actions/projects";
import { CreateProjectButton } from "@/components/projects/create-project-button";
import { DiagramPreview } from "@/components/projects/diagram-preview";
import { WorkspaceSwitcher } from "@/components/projects/workspace-switcher";
import { Logo } from "@/components/logo";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import { Modal, ModalContent } from "@/components/ui/modal";
import { timeAgo } from "@/lib/utils";
import { PROJECT_TEMPLATES, type DiagramSnapshot } from "@dataflow/shared";

type ProjectCard = {
  id: string;
  name: string;
  description: string;
  kind: "personal" | "shared";
  updatedAt: Date;
  deletedAt: Date | null;
  rootDiagramId?: string;
  snapshot: DiagramSnapshot;
  tags: { id: string; name: string; color: string }[];
  members: { id: string; name: string | null; email: string | null; image: string | null }[];
};

export function ProjectsShell({
  user,
  workspaces,
  projects,
  filter,
  workspaceId,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
  workspaces: { id: string; name: string }[];
  projects: ProjectCard[];
  filter: string;
  workspaceId?: string;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const view = params.get("view") === "list" ? "list" : "grid";
  const activeFilter = filter === "trash" || filter === "templates" || filter === "team" ? "all" : filter;
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    next.set(key, value);
    router.push(`${pathname}?${next.toString()}`);
  }

  function selectWorkspace(id: string) {
    const next = new URLSearchParams(params);
    next.set("workspace", id);
    next.set("filter", "team");
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-[240px] shrink-0 flex-col border-r border-border bg-sidebar px-3 py-4">
        <div className="px-2 py-1">
          <Link href="/projects" className="inline-flex rounded-lg hover:opacity-90">
            <Logo />
          </Link>
        </div>
        <WorkspaceSwitcher workspaces={workspaces} workspaceId={workspaceId} onSelect={selectWorkspace} />
        <nav className="space-y-0.5 text-[13px] text-zinc-400">
          <Nav href="/projects?filter=all" active={filter === "all"} icon={<Folder className="size-4" />}>
            My projects
          </Nav>
          <Nav href="/projects?filter=shared" active={filter === "shared"} icon={<UserPlus className="size-4" />}>
            Shared with me
          </Nav>
          <Nav
            href={`/projects?filter=team${workspaceId ? `&workspace=${workspaceId}` : ""}`}
            active={filter === "team"}
            icon={<Users className="size-4" />}
          >
            Team projects
          </Nav>
          <Nav href="/projects?filter=templates" active={filter === "templates"} icon={<FileText className="size-4" />}>
            Templates
          </Nav>
          <Nav href="/projects?filter=trash" active={filter === "trash"} icon={<Trash2 className="size-4" />}>
            Trash
          </Nav>
        </nav>
        <div className="mt-auto flex items-center justify-between px-1 pt-4">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar name={user.name} email={user.email} image={user.image} />
            <span className="truncate text-sm">{user.name ?? user.email}</span>
          </div>
          <Menu>
            <MenuTrigger asChild>
              <button className="rounded-md p-1 text-zinc-500 hover:bg-white/5 hover:text-white">
                <Settings className="size-4" />
              </button>
            </MenuTrigger>
            <MenuContent>
              <MenuItem
                onSelect={() => {
                  setProfileError(null);
                  setProfileOpen(true);
                }}
              >
                Edit profile
              </MenuItem>
              <MenuItem onSelect={() => logout()}>Sign out</MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </aside>

      <Modal open={profileOpen} onOpenChange={setProfileOpen}>
        <ModalContent title="Edit profile" description="Update how your name appears across ClusterDeck.">
          <form
            className="space-y-3"
            action={async (formData) => {
              setProfileError(null);
              const result = await updateProfileName(formData);
              if (result?.error) {
                setProfileError(result.error);
                return;
              }
              setProfileOpen(false);
              router.refresh();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Display name</Label>
              <Input
                id="profile-name"
                name="name"
                required
                maxLength={80}
                defaultValue={user.name ?? ""}
                placeholder="Your name"
              />
            </div>
            <p className="text-xs text-zinc-500">{user.email}</p>
            {profileError ? <p className="text-sm text-red-400">{profileError}</p> : null}
            <Button type="submit" className="w-full">
              Save name
            </Button>
          </form>
        </ModalContent>
      </Modal>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 px-6 pt-4 pb-2">
          <div className="relative max-w-[560px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" />
            <Input
              defaultValue={params.get("q") ?? ""}
              placeholder="Search projects, diagrams, people..."
              className="h-10 rounded-xl border-border bg-card pl-9 pr-14"
              onKeyDown={(event) => {
                if (event.key === "Enter") setParam("q", event.currentTarget.value);
              }}
            />
            <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[10px] text-zinc-500">
              ⌘K
            </kbd>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <CreateProjectButton
              workspaceId={filter === "team" ? workspaceId : undefined}
              triggerClassName="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white hover:bg-[#6b74fb]"
            >
              <Plus className="size-4" /> New project
            </CreateProjectButton>
            <Menu>
              <MenuTrigger asChild>
                <button className="grid size-10 place-items-center rounded-xl text-zinc-400 hover:bg-white/5">
                  <Bell className="size-4" />
                </button>
              </MenuTrigger>
              <MenuContent>
                <div className="px-2 py-3 text-sm text-zinc-500">No notifications</div>
              </MenuContent>
            </Menu>
          </div>
        </header>

        <main className="flex-1 px-8 pt-6 pb-10">
          <p className="text-[11px] tracking-[0.16em] text-zinc-500 uppercase">Projects</p>
          <h1 className="mt-1 text-[32px] leading-none font-semibold tracking-tight">Projects</h1>
          <p className="mt-2 text-sm text-zinc-500">Create and manage your infrastructure diagrams</p>

          <div className="mt-6 mb-5 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {(["all", "personal", "shared"] as const).map((item) => (
                <Link
                  key={item}
                  href={`/projects?filter=${item}`}
                  className={`rounded-lg px-3 py-1.5 text-sm capitalize ${
                    activeFilter === item
                      ? "border border-border bg-secondary text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {item}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <select
                className="h-9 rounded-lg border border-border bg-card px-2 text-sm text-zinc-300"
                defaultValue={params.get("sort") ?? "updated"}
                onChange={(event) => setParam("sort", event.target.value)}
              >
                <option value="updated">Last edited</option>
                <option value="name">Name</option>
              </select>
              <div className="flex rounded-lg border border-border p-0.5">
                <button
                  className={`grid size-8 place-items-center rounded-md ${view === "grid" ? "bg-secondary text-white" : "text-zinc-500"}`}
                  onClick={() => setParam("view", "grid")}
                >
                  <LayoutGrid className="size-4" />
                </button>
                <button
                  className={`grid size-8 place-items-center rounded-md ${view === "list" ? "bg-secondary text-white" : "text-zinc-500"}`}
                  onClick={() => setParam("view", "list")}
                >
                  <List className="size-4" />
                </button>
              </div>
            </div>
          </div>

          <div className={view === "grid" ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
            {filter === "templates"
              ? PROJECT_TEMPLATES.map((template) => (
                  <article key={template.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="rounded-xl bg-surface px-2 pt-2">
                      <DiagramPreview snapshot={template.snapshot} />
                    </div>
                    <h2 className="mt-3 text-[15px] font-medium">{template.name}</h2>
                    <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-zinc-500">{template.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {template.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[11px] text-zinc-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <CreateProjectButton
                      workspaceId={workspaceId}
                      defaultTemplate={template.id}
                      triggerClassName="mt-4 inline-flex h-9 w-full items-center justify-center rounded-xl border border-border text-sm text-zinc-200 hover:bg-white/5"
                    >
                      Use template
                    </CreateProjectButton>
                  </article>
                ))
              : projects.map((project) => (
              <article
                key={project.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <Link href={project.rootDiagramId ? `/editor/${project.id}/${project.rootDiagramId}` : "/projects"}>
                  <div className="rounded-xl bg-surface px-2 pt-2">
                    <DiagramPreview snapshot={project.snapshot} />
                  </div>
                  <h2 className="mt-3 text-[15px] font-medium">{project.name}</h2>
                  <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-zinc-500">{project.description}</p>
                </Link>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {project.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2 py-0.5 text-[11px] text-zinc-300"
                    >
                      <span className="size-1.5 rounded-full" style={{ background: tag.color }} />
                      {tag.name}
                    </span>
                  ))}
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-zinc-400">
                    <Users className="size-3" />
                    {project.kind === "shared" ? "Shared" : "Personal"}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[11px] text-zinc-500">
                  <div className="flex items-center">
                    <div className="flex -space-x-1.5">
                      {project.members.slice(0, 3).map((member) => (
                        <Avatar
                          key={member.id}
                          name={member.name}
                          email={member.email}
                          image={member.image}
                          className="size-6 ring-2 ring-card"
                        />
                      ))}
                    </div>
                    {project.members.length > 3 ? (
                      <span className="ml-2">+{project.members.length - 3}</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{timeAgo(project.updatedAt)}</span>
                    <Menu>
                      <MenuTrigger asChild>
                        <button className="rounded p-1 hover:bg-white/5">
                          <MoreHorizontal className="size-4" />
                        </button>
                      </MenuTrigger>
                      <MenuContent>
                        {filter === "trash" ? (
                          <>
                            <MenuItem onSelect={() => restoreProject(project.id)}>Restore</MenuItem>
                            <MenuItem onSelect={() => deleteProjectForever(project.id)}>Delete</MenuItem>
                          </>
                        ) : (
                          <MenuItem onSelect={() => trashProject(project.id)}>Move to trash</MenuItem>
                        )}
                      </MenuContent>
                    </Menu>
                  </div>
                </div>
              </article>
            ))}
            {filter !== "trash" && filter !== "templates" ? (
              <CreateProjectButton
                workspaceId={filter === "team" ? workspaceId : undefined}
                triggerClassName="flex min-h-[292px] flex-col items-center justify-center rounded-2xl border border-dashed border-border text-zinc-500 hover:bg-white/[0.02]"
              >
                <span className="mb-3 grid size-14 place-items-center rounded-full border border-border">
                  <Plus className="size-6" />
                </span>
                <span className="text-sm text-zinc-200">Create new project</span>
                <span className="mt-1 text-xs text-zinc-500">Start from a template or an empty diagram</span>
              </CreateProjectButton>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}

function Nav({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`relative flex items-center gap-2.5 rounded-xl px-3 py-2 ${
        active ? "bg-[#202127] text-white" : "hover:bg-white/5"
      }`}
    >
      {active ? <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-primary" /> : null}
      {icon}
      {children}
    </Link>
  );
}
