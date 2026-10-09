"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, LogOut, Send, Trash2, Users } from "lucide-react";
import {
  cancelWorkspaceInvite,
  deleteWorkspace,
  inviteWorkspaceMember,
  leaveWorkspace,
  removeWorkspaceMember,
  renameWorkspace,
  transferWorkspaceOwnership,
  updateWorkspaceMemberRole,
} from "@/actions/workspaces";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal, ModalContent, ModalTrigger } from "@/components/ui/modal";
import { FormSelect } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { canManageWorkspace, type WorkspaceRole } from "@dataflow/shared";

type Member = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: WorkspaceRole;
};

type PendingInvite = {
  id: string;
  email: string;
  role: "admin" | "member";
};

export function TeamManageDialog({
  workspaceId,
  workspaceName,
  currentRole,
  members,
  invites,
}: {
  workspaceId: string;
  workspaceName: string;
  currentRole: WorkspaceRole;
  members: Member[];
  invites: PendingInvite[];
}) {
  const router = useRouter();
  const canManage = canManageWorkspace(currentRole);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [sending, setSending] = useState(false);
  const [people, setPeople] = useState(members);
  const [pending, setPending] = useState(invites);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [teamName, setTeamName] = useState(workspaceName);
  const [renaming, setRenaming] = useState(false);
  const [transferTarget, setTransferTarget] = useState("");
  const [transferring, setTransferring] = useState(false);
  const isOwner = currentRole === "owner";
  const canDelete = isOwner && confirmName === teamName;
  const transferCandidates = people.filter((member) => member.role !== "owner");

  useEffect(() => {
    setPeople(members);
  }, [members]);

  useEffect(() => {
    setPending(invites);
  }, [invites]);

  useEffect(() => {
    setTeamName(workspaceName);
  }, [workspaceName]);

  return (
    <Modal>
      <ModalTrigger asChild>
        <Button variant="secondary" size="sm" className="h-8 gap-1.5 rounded-lg">
          <Users className="size-3.5" /> Manage
        </Button>
      </ModalTrigger>
      <ModalContent title={teamName} description="Invite people, manage roles, or leave this team.">
        {canManage ? (
          <form
            className="mb-5 space-y-3"
            onSubmit={async (event) => {
              event.preventDefault();
              if (renaming || teamName.trim() === workspaceName) return;
              setRenaming(true);
              try {
                const result = await renameWorkspace(workspaceId, teamName);
                if (result.error) {
                  toast(result.error, "error");
                  setTeamName(workspaceName);
                  return;
                }
                toast("Team renamed", "success");
                router.refresh();
              } catch {
                toast("Couldn’t rename team", "error");
                setTeamName(workspaceName);
              } finally {
                setRenaming(false);
              }
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="team-name">Team name</Label>
              <div className="flex gap-2">
                <Input
                  id="team-name"
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                />
                <Button
                  type="submit"
                  variant="secondary"
                  className="shrink-0"
                  disabled={renaming || !teamName.trim() || teamName.trim() === workspaceName}
                >
                  {renaming ? "Saving…" : "Rename"}
                </Button>
              </div>
            </div>
          </form>
        ) : null}

        {canManage ? (
          <form
            className="mb-5 flex gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!email.trim() || sending) return;
              setSending(true);
              try {
                const result = await inviteWorkspaceMember(workspaceId, email, role);
                if (result.error) {
                  toast(result.error, "error");
                  return;
                }
                toast("Invite sent", "success");
                setEmail("");
                router.refresh();
              } catch {
                toast("Couldn’t send invite", "error");
              } finally {
                setSending(false);
              }
            }}
          >
            <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" />
            <FormSelect
              value={role}
              onValueChange={(next) => setRole(next as "admin" | "member")}
              className="w-[120px] shrink-0"
              options={[
                { value: "member", label: "Member" },
                { value: "admin", label: "Admin" },
              ]}
            />
            <Button type="submit" className="h-10 shrink-0" disabled={sending}>
              <Send className="size-4" /> {sending ? "Sending..." : "Send"}
            </Button>
          </form>
        ) : null}

        <div className="mb-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>Team members</span>
            <span className="text-xs text-zinc-500">{people.length} people</span>
          </div>
          {people.map((member) => {
            const memberIsOwner = member.role === "owner";
            const canRemove = canManage && !memberIsOwner;
            return (
              <div key={member.id} className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar name={member.name} email={member.email} image={member.image} />
                  <div className="min-w-0">
                    <div className="truncate text-sm">{member.name ?? member.email}</div>
                    {memberIsOwner ? <div className="text-[11px] text-zinc-500">Team owner</div> : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {memberIsOwner || !canManage ? (
                    <span className="inline-flex h-8 w-[110px] items-center justify-center rounded-lg border border-[#2a2a2e] text-xs capitalize text-zinc-400">
                      {member.role}
                    </span>
                  ) : (
                    <FormSelect
                      size="sm"
                      className="w-[110px]"
                      value={member.role}
                      onValueChange={async (next) => {
                        const result = await updateWorkspaceMemberRole(
                          workspaceId,
                          member.id,
                          next as "admin" | "member",
                        );
                        if (result.error) {
                          toast(result.error, "error");
                          return;
                        }
                        setPeople((current) =>
                          current.map((item) =>
                            item.id === member.id ? { ...item, role: next as WorkspaceRole } : item,
                          ),
                        );
                        router.refresh();
                      }}
                      options={[
                        { value: "member", label: "Member" },
                        { value: "admin", label: "Admin" },
                      ]}
                    />
                  )}
                  {isOwner && !memberIsOwner ? (
                    <button
                      type="button"
                      title="Make team owner"
                      disabled={busyId === member.id || transferring}
                      className="grid size-8 place-items-center rounded-lg text-zinc-500 hover:bg-amber-500/10 hover:text-amber-300 disabled:opacity-50"
                      onClick={async () => {
                        if (
                          !window.confirm(
                            `Transfer ownership to ${member.name ?? member.email ?? "this member"}? You will become an admin.`,
                          )
                        ) {
                          return;
                        }
                        setBusyId(member.id);
                        setTransferring(true);
                        try {
                          const result = await transferWorkspaceOwnership(workspaceId, member.id);
                          if (result.error) {
                            toast(result.error, "error");
                            return;
                          }
                          setPeople((current) =>
                            current.map((item) => {
                              if (item.id === member.id) return { ...item, role: "owner" };
                              if (item.role === "owner") return { ...item, role: "admin" };
                              return item;
                            }),
                          );
                          toast("Ownership transferred", "success");
                          router.refresh();
                        } catch {
                          toast("Couldn’t transfer ownership", "error");
                        } finally {
                          setBusyId(null);
                          setTransferring(false);
                        }
                      }}
                    >
                      <Crown className="size-3.5" />
                    </button>
                  ) : null}
                  {canRemove ? (
                    <button
                      type="button"
                      title="Remove from team"
                      disabled={busyId === member.id}
                      className="grid size-8 place-items-center rounded-lg text-zinc-500 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                      onClick={async () => {
                        setBusyId(member.id);
                        try {
                          const result = await removeWorkspaceMember(workspaceId, member.id);
                          if (result.error) {
                            toast(result.error, "error");
                            return;
                          }
                          setPeople((current) => current.filter((item) => item.id !== member.id));
                          toast("Removed from team", "success");
                          router.refresh();
                        } catch {
                          toast("Couldn’t remove member", "error");
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  ) : (
                    <span className="size-8" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {canManage && pending.length ? (
          <div className="space-y-2 border-t border-[#2a2a2e] pt-4">
            <div className="text-sm text-zinc-400">Pending invites</div>
            {pending.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate text-zinc-200">{invite.email}</div>
                  <div className="text-[11px] text-zinc-500 capitalize">{invite.role}</div>
                </div>
                <button
                  type="button"
                  title="Cancel invite"
                  disabled={busyId === invite.id}
                  className="grid size-8 place-items-center rounded-lg text-zinc-500 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                  onClick={async () => {
                    setBusyId(invite.id);
                    try {
                      const result = await cancelWorkspaceInvite(workspaceId, invite.id);
                      if (result.error) {
                        toast(result.error, "error");
                        return;
                      }
                      setPending((current) => current.filter((item) => item.id !== invite.id));
                      toast("Invite cancelled", "success");
                      router.refresh();
                    } catch {
                      toast("Couldn’t cancel invite", "error");
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {isOwner && transferCandidates.length ? (
          <div className="mt-5 space-y-3 border-t border-[#2a2a2e] pt-4">
            <div>
              <div className="text-sm text-zinc-200">Transfer ownership</div>
              <p className="mt-1 text-[12px] text-zinc-500">
                Make someone else the owner. You become an admin and can then leave the team.
              </p>
            </div>
            <div className="flex gap-2">
              <FormSelect
                value={transferTarget}
                onValueChange={setTransferTarget}
                className="min-w-0 flex-1"
                placeholder="Choose member"
                options={transferCandidates.map((member) => ({
                  value: member.id,
                  label: member.name ?? member.email ?? member.id,
                }))}
              />
              <Button
                type="button"
                variant="secondary"
                className="shrink-0"
                disabled={!transferTarget || transferring}
                onClick={async () => {
                  if (!transferTarget || transferring) return;
                  const target = transferCandidates.find((member) => member.id === transferTarget);
                  if (
                    !window.confirm(
                      `Transfer ownership to ${target?.name ?? target?.email ?? "this member"}? You will become an admin.`,
                    )
                  ) {
                    return;
                  }
                  setTransferring(true);
                  try {
                    const result = await transferWorkspaceOwnership(workspaceId, transferTarget);
                    if (result.error) {
                      toast(result.error, "error");
                      return;
                    }
                    setPeople((current) =>
                      current.map((item) => {
                        if (item.id === transferTarget) return { ...item, role: "owner" };
                        if (item.role === "owner") return { ...item, role: "admin" };
                        return item;
                      }),
                    );
                    setTransferTarget("");
                    toast("Ownership transferred", "success");
                    router.refresh();
                  } catch {
                    toast("Couldn’t transfer ownership", "error");
                  } finally {
                    setTransferring(false);
                  }
                }}
              >
                <Crown className="size-4" />
                {transferring ? "Transferring…" : "Transfer"}
              </Button>
            </div>
          </div>
        ) : null}

        {!isOwner ? (
          <div className="mt-5 space-y-3 border-t border-[#2a2a2e] pt-4">
            <div>
              <div className="text-sm text-zinc-200">Leave team</div>
              <p className="mt-1 text-[12px] text-zinc-500">
                You will lose access to this team’s projects until invited again.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={leaving}
              onClick={async () => {
                setLeaving(true);
                try {
                  const result = await leaveWorkspace(workspaceId);
                  if (result.error) {
                    toast(result.error, "error");
                    return;
                  }
                  toast("Left team", "success");
                  router.push("/projects");
                  router.refresh();
                } catch {
                  toast("Couldn’t leave team", "error");
                } finally {
                  setLeaving(false);
                }
              }}
            >
              <LogOut className="size-4" />
              {leaving ? "Leaving..." : "Leave team"}
            </Button>
          </div>
        ) : transferCandidates.length === 0 ? (
          <div className="mt-5 space-y-2 border-t border-[#2a2a2e] pt-4">
            <div className="text-sm text-zinc-200">Leave team</div>
            <p className="text-[12px] text-zinc-500">
              Invite another member and transfer ownership before you can leave, or delete the team.
            </p>
          </div>
        ) : null}

        {isOwner ? (
          <div className="mt-5 space-y-3 border-t border-red-500/20 pt-4">
            <div>
              <div className="text-sm text-red-300">Delete team</div>
              <p className="mt-1 text-[12px] text-zinc-500">
                Permanently deletes this team. Its projects move to Trash. Type{" "}
                <span className="font-medium text-zinc-300">{teamName}</span> to confirm.
              </p>
            </div>
            <Input
              value={confirmName}
              onChange={(event) => setConfirmName(event.target.value)}
              placeholder={teamName}
              autoComplete="off"
              spellCheck={false}
            />
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              disabled={!canDelete || deleting}
              onClick={async () => {
                if (!canDelete || deleting) return;
                setDeleting(true);
                try {
                  const result = await deleteWorkspace(workspaceId);
                  if (result.error) {
                    toast(result.error, "error");
                    return;
                  }
                  toast("Team deleted", "success");
                  router.push("/projects");
                  router.refresh();
                } catch {
                  toast("Couldn’t delete team", "error");
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? "Deleting..." : "Delete team"}
            </Button>
          </div>
        ) : null}
      </ModalContent>
    </Modal>
  );
}
