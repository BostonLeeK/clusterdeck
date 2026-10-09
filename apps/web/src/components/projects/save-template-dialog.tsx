"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveProjectAsTemplate } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Modal, ModalContent } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";

export function SaveTemplateDialog({
  projectId,
  projectName,
  projectDescription,
  hasWorkspace,
  open,
  onOpenChange,
}: {
  projectId: string;
  projectName: string;
  projectDescription: string;
  hasWorkspace: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(projectName);
  const [description, setDescription] = useState(projectDescription);
  const [workspaceScoped, setWorkspaceScoped] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(projectName);
    setDescription(projectDescription);
    setWorkspaceScoped(false);
  }, [open, projectDescription, projectName]);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent title="Save as template" description="Reuse this project’s diagram tree when creating new projects.">
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (pending) return;
            setPending(true);
            try {
              const result = await saveProjectAsTemplate(projectId, {
                name,
                description,
                workspaceScoped: hasWorkspace && workspaceScoped,
              });
              if (result.error) {
                toast(result.error, "error");
                return;
              }
              toast("Template saved", "success");
              onOpenChange(false);
              router.push("/projects?filter=templates");
              router.refresh();
            } catch {
              toast("Couldn’t save template", "error");
            } finally {
              setPending(false);
            }
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="template-name">Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What does this template cover?"
            />
          </div>
          {hasWorkspace ? (
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={workspaceScoped}
                onChange={(event) => setWorkspaceScoped(event.target.checked)}
                className="size-4 rounded border-border bg-transparent"
              />
              Share with the project’s team
            </label>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending || !name.trim()}>
            {pending ? "Saving…" : "Save template"}
          </Button>
        </form>
      </ModalContent>
    </Modal>
  );
}
