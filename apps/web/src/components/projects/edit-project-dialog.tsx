"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProject } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Modal, ModalContent } from "@/components/ui/modal";

export function EditProjectDialog({
  project,
  open,
  onOpenChange,
}: {
  project: { id: string; name: string; description: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateProject(project.id, {
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? ""),
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent title="Edit project" description="Rename the project or update its description.">
        <form key={String(open)} className="space-y-3" action={submit}>
          <div className="space-y-1">
            <Label htmlFor={`project-name-${project.id}`}>Name</Label>
            <Input
              id={`project-name-${project.id}`}
              name="name"
              required
              autoFocus
              defaultValue={project.name}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`project-description-${project.id}`}>Description</Label>
            <Textarea
              id={`project-description-${project.id}`}
              name="description"
              rows={3}
              defaultValue={project.description}
            />
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </form>
      </ModalContent>
    </Modal>
  );
}
