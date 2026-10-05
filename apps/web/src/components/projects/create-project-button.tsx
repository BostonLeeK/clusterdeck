"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Modal, ModalContent, ModalTrigger } from "@/components/ui/modal";

export function CreateProjectButton({
  workspaceId,
  triggerClassName,
  children,
}: {
  workspaceId?: string;
  triggerClassName?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>
        <button className={triggerClassName}>{children}</button>
      </ModalTrigger>
      <ModalContent title="Create new project" description="Start from an empty diagram.">
        <form
          className="space-y-3"
          action={async (formData) => {
            setError(null);
            setPending(true);
            try {
              if (workspaceId) formData.set("workspaceId", workspaceId);
              const result = await createProject(formData);
              if (result?.error) {
                setError(result.error);
                return;
              }
              setOpen(false);
              if (result.diagramId) router.push(`/editor/${result.projectId}/${result.diagramId}`);
              else router.refresh();
            } finally {
              setPending(false);
            }
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Production Infrastructure" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" placeholder="What does this diagram cover?" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="kind">Visibility</Label>
            <select
              id="kind"
              name="kind"
              className="h-9 w-full rounded-lg border border-border bg-zinc-950/60 px-3 text-sm"
            >
              <option value="personal">Personal</option>
              <option value="shared">Shared</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="tags">Tags</Label>
            <Input id="tags" name="tags" placeholder="aws, k8s, prod" />
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating…" : "Create project"}
          </Button>
        </form>
      </ModalContent>
    </Modal>
  );
}
