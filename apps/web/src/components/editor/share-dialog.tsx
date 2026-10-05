"use client";

import { useState } from "react";
import { Copy, Send } from "lucide-react";
import { inviteMember, setLinkAccess, updateMemberRole } from "@/actions/sharing";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ModalContent, ModalTrigger } from "@/components/ui/modal";
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
}: {
  projectId: string;
  shareToken: string;
  linkAccess: "none" | "view";
  members: Member[];
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("editor");
  const [enabled, setEnabled] = useState(linkAccess === "view");
  const [sending, setSending] = useState(false);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const url = `${origin}/p/${shareToken}`;

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
            } catch {
              toast("Couldn’t send invite", "error");
            } finally {
              setSending(false);
            }
          }}
        >
          <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" />
          <select
            className="h-10 rounded-xl border border-[#2a2a2e] bg-[#121214] px-2 text-sm"
            value={role}
            onChange={(event) => setRole(event.target.value as MemberRole)}
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
            <option value="owner">Owner</option>
          </select>
          <Button type="submit" className="h-10 shrink-0" disabled={sending}>
            <Send className="size-4" /> {sending ? "Sending..." : "Send invite"}
          </Button>
        </form>
        <div className="mb-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>People with access</span>
            <span className="text-xs text-zinc-500">{members.length} people</span>
          </div>
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar name={member.name} email={member.email} image={member.image} />
                <span className="text-sm">{member.name ?? member.email}</span>
              </div>
              <select
                className="h-8 rounded-md bg-transparent px-2 text-xs text-zinc-400"
                value={member.role}
                onChange={(event) => updateMemberRole(projectId, member.id, event.target.value as MemberRole)}
              >
                <option value="owner">Owner</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-[#2a2a2e] p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm">Anyone with the link can view</div>
              <div className="text-xs text-zinc-500">Anyone with this link can view the project, even without an account.</div>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={(value) => {
                setEnabled(value);
                void setLinkAccess(projectId, value);
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
