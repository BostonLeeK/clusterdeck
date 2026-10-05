import { notFound } from "next/navigation";
import { EditorApp } from "@/components/editor/editor-app";
import { getPublicProject } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function PublicPage({ params }: PageProps<"/p/[shareToken]">) {
  const { shareToken } = await params;
  const data = await getPublicProject(shareToken);
  if (!data?.root) notFound();
  return (
    <EditorApp
      projectId={data.project.id}
      diagramId={data.root.id}
      projectName={data.project.name}
      shareToken={data.project.shareToken}
      linkAccess={data.project.linkAccess}
      ownerId={data.project.ownerId}
      members={[]}
      trail={[{ id: data.root.id, name: data.root.name }]}
      snapshot={data.root.snapshot}
      user={{ name: "Guest" }}
      forceReadOnly
    />
  );
}
