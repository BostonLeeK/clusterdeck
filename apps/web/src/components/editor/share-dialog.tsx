"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Send, Trash2 } from "lucide-react";
import {
  ensureShortShareToken,
  inviteMember,
  removeMember,
  setLinkAccess,
  updateMemberRole,
} from "@/actions/sharing";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ModalContent, ModalTrigger } from "@/components/ui/modal";
import { FormSelect } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import type { MemberRole } from "@dataflow/shared";

type Member = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: MemberRole;
};

export function ShareDialog({
  projectId,
  shareToken,
  linkAccess,
  members,
  ownerId,
  currentUserId,
  canManage,
}: {
  projectId: string;
  shareToken: string;
  linkAccess: "none" | "view";
  members: Member[];
  ownerId: string;
  currentUserId?: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("editor");
  const [enabled, setEnabled] = useState(linkAccess === "view");
  const [sending, setSending] = useState(false);
  const [people, setPeople] = useState(members);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [token, setToken] = useState(shareToken);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const url = `${origin}/p/${token}`;

  useEffect(() => {
    setPeople(members);
  }, [members]);

  useEffect(() => {
    setToken(shareToken);
  }, [shareToken]);

  useEffect(() => {
    setEnabled(linkAccess === "view");
  }, [linkAccess]);

  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    void ensureShortShareToken(projectId).then((result) => {
      if (cancelled || result.error || !result.shareToken) return;
      setToken((current) => (current === result.shareToken ? current : result.shareToken!));
      if (result.shareToken !== shareToken) router.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [canManage, projectId, router, shareToken]);

  if (!canManage) return null;

  return (
    <Modal>
      <ModalTrigger asChild>
        <Button size="sm" className="h-8 rounded-lg">
          Share
        </Button>
      </ModalTrigger>
      <ModalContent title="Share project" description="Invite people to collaborate on this project.">
        <div className="mb-2 text-sm">Invite by email</div>
        <form
          className="mb-5 flex gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!email.trim() || sending) return;
            setSending(true);
            try {
              const result = await inviteMember(projectId, email, role);
              if (result?.error) {
                toast(result.error, "error");
                return;
              }
              toast("Invite email sent", "success");
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
            onValueChange={(next) => setRole(next as MemberRole)}
            className="w-[120px] shrink-0"
            options={[
              { value: "editor", label: "Editor" },
              { value: "viewer", label: "Viewer" },
            ]}
          />
          <Button type="submit" className="h-10 shrink-0" disabled={sending}>
            <Send className="size-4" /> {sending ? "Sending..." : "Send invite"}
          </Button>
        </form>
        <div className="mb-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>People with access</span>
            <span className="text-xs text-zinc-500">{people.length} people</span>
          </div>
          {people.map((member) => {
            const isProjectOwner = member.id === ownerId;
            const canRemove = !isProjectOwner && member.id !== currentUserId;
            return (
              <div key={member.id} className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar name={member.name} email={member.email} image={member.image} />
                  <div className="min-w-0">
                    <div className="truncate text-sm">{member.name ?? member.email}</div>
                    {isProjectOwner ? <div className="text-[11px] text-zinc-500">Project owner</div> : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {isProjectOwner ? (
                    <span className="inline-flex h-8 w-[110px] items-center justify-center rounded-lg border border-[#2a2a2e] text-xs text-zinc-400">
                      Owner
                    </span>
                  ) : (
                    <FormSelect
                      size="sm"
                      className="w-[110px]"
                      value={member.role}
                      onValueChange={async (next) => {
                        const result = await updateMemberRole(projectId, member.id, next as MemberRole);
                        if (result?.error) {
                          toast(result.error, "error");
                          return;
                        }
                        setPeople((current) =>
                          current.map((item) =>
                            item.id === member.id ? { ...item, role: next as MemberRole } : item,
                          ),
                        );
                        router.refresh();
                      }}
                      options={[
                        { value: "editor", label: "Editor" },
                        { value: "viewer", label: "Viewer" },
                      ]}
                    />
                  )}
                  {canRemove ? (
                    <button
                      type="button"
                      title="Remove access"
                      disabled={removingId === member.id}
                      className="grid size-8 place-items-center rounded-lg text-zinc-500 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                      onClick={async () => {
                        setRemovingId(member.id);
                        try {
                          const result = await removeMember(projectId, member.id);
                          if (result?.error) {
                            toast(result.error, "error");
                            return;
                          }
                          setPeople((current) => current.filter((item) => item.id !== member.id));
                          toast("Access removed", "success");
                          router.refresh();
                        } catch {
                          toast("Couldn’t remove member", "error");
                        } finally {
                          setRemovingId(null);
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
        <div className="rounded-xl border border-[#2a2a2e] p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm">Anyone with the link can view</div>
              <div className="text-xs text-zinc-500">
                Public link access is separate from invites. Removed people can still open this link until you turn it off.
              </div>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={async (value) => {
                setEnabled(value);
                try {
                  await setLinkAccess(projectId, value);
                } catch {
                  setEnabled(!value);
                  toast("Couldn’t update link access", "error");
                }
              }}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Input readOnly value={url} className="h-9" />
            <Button
              variant="secondary"
              className="h-9 shrink-0"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  toast("Link copied", "success");
                } catch {
                  toast("Couldn’t copy link", "error");
                }
              }}
            >
              <Copy className="size-3.5" /> Copy link
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
