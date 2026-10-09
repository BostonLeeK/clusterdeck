import { notFound } from "next/navigation";
import { EditorApp } from "@/components/editor/editor-app";
import { mergeInheritedPorts } from "@/lib/diagram";
import { getPublicDiagram } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function PublicDiagramPage({
  params,
}: {
  params: Promise<{ shareToken: string; diagramId: string }>;
}) {
  const { shareToken, diagramId } = await params;
  const data = await getPublicDiagram(shareToken, diagramId);
  if (!data) notFound();

  let snapshot = data.diagram.snapshot;
  if (data.parentSnapshot && data.parentNodeId) {
    snapshot = mergeInheritedPorts(data.parentSnapshot, data.parentNodeId, snapshot);
  }

  return (
    <EditorApp
      key={data.diagram.id}
      projectId={data.project.id}
      diagramId={data.diagram.id}
      projectName={data.project.name}
      shareToken={data.project.shareToken}
      linkAccess={data.project.linkAccess}
      ownerId={data.project.ownerId}
      members={[]}
      trail={data.trail}
      snapshot={snapshot}
      user={{ name: "Guest" }}
      forceReadOnly
      insideLabel={data.diagram.parentDiagramId ? data.diagram.name : undefined}
    />
  );
}
