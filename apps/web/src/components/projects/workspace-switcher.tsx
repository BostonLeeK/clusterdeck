"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Plus } from "lucide-react";
import { createWorkspace } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import { Modal, ModalContent } from "@/components/ui/modal";

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  onSelect,
  onSelectPersonal,
}: {
  workspaces: { id: string; name: string }[];
  activeWorkspaceId?: string;
  onSelect: (id: string) => void;
  onSelectPersonal: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = workspaces.find((item) => item.id === activeWorkspaceId);

  return (
    <>
      <Menu>
        <MenuTrigger asChild>
          <button
            type="button"
            className="mt-5 mb-4 flex h-10 w-full items-center justify-between rounded-xl border border-[#232326] bg-[#141416] px-3 text-sm"
          >
            <span className="truncate">{current?.name ?? "Personal"}</span>
            <ChevronDown className="size-4 shrink-0 text-zinc-500" />
          </button>
        </MenuTrigger>
        <MenuContent className="w-[220px]">
          <SwitcherItem label="Personal" active={!current} onSelect={onSelectPersonal} />
          {workspaces.map((workspace) => (
            <SwitcherItem
              key={workspace.id}
              label={workspace.name}
              active={workspace.id === current?.id}
              onSelect={() => onSelect(workspace.id)}
            />
          ))}
          <MenuItem onSelect={() => setOpen(true)}>
            <Plus className="size-3.5" /> New team
          </MenuItem>
        </MenuContent>
      </Menu>
      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent title="Create team" description="Teams group shared infrastructure projects.">
          <form
            className="space-y-3"
            action={async (formData) => {
              setError(null);
              const result = await createWorkspace(String(formData.get("name") ?? ""));
              if (result.error) {
                setError(result.error);
                return;
              }
              setOpen(false);
              if (result.id) onSelect(result.id);
              router.refresh();
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="workspace-name">Team name</Label>
              <Input id="workspace-name" name="name" required placeholder="Dev Team" />
            </div>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <Button type="submit" className="w-full">
              Create team
            </Button>
          </form>
        </ModalContent>
      </Modal>
    </>
  );
}

function SwitcherItem({
  label,
  active,
  onSelect,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <MenuItem onSelect={onSelect} className="justify-between">
      <span className="truncate">{label}</span>
      {active ? <Check className="size-3.5 shrink-0 text-zinc-400" /> : null}
    </MenuItem>
  );
}
