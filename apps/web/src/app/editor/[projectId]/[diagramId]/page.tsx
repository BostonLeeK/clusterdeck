import { notFound } from "next/navigation";
import { EditorApp } from "@/components/editor/editor-app";
import { mergeInheritedPorts } from "@/lib/diagram";
import { getDiagramWithTrail, getProjectBundle, requireUser } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function EditorPage({
  params,
}: PageProps<"/editor/[projectId]/[diagramId]">) {
  const user = await requireUser();
  const { projectId, diagramId } = await params;
  const [bundle, trail] = await Promise.all([
    getProjectBundle(projectId, user.id),
    getDiagramWithTrail(diagramId),
  ]);
  if (!bundle || !trail || trail.diagram.projectId !== projectId) notFound();

  let snapshot = trail.diagram.snapshot;
  if (trail.diagram.parentDiagramId && trail.diagram.parentNodeId) {
    const parent = bundle.diagrams.find((item) => item.id === trail.diagram.parentDiagramId);
    if (parent) {
      snapshot = mergeInheritedPorts(parent.snapshot, trail.diagram.parentNodeId, snapshot);
    }
  }

  return (
    <EditorApp
      projectId={projectId}
      diagramId={diagramId}
      projectName={bundle.project.name}
      shareToken={bundle.project.shareToken}
      linkAccess={bundle.project.linkAccess}
      ownerId={bundle.project.ownerId}
      members={bundle.members}
      trail={trail.trail}
      snapshot={snapshot}
      user={user}
      insideLabel={trail.diagram.parentDiagramId ? trail.diagram.name : undefined}
    />
  );
}
