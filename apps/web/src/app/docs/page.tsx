import type { Metadata } from "next";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "Docs · ClusterDeck",
  description: "How to map infrastructure, collaborate, and share with ClusterDeck.",
};

export default function DocsPage() {
  return (
    <SiteShell active="docs">
      <p className="text-[11px] tracking-[0.16em] text-zinc-500 uppercase">Documentation</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">ClusterDeck docs</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-400">
        Visualize services, data stores, and connections as a shared diagram your team can edit live.
      </p>

      <section className="mt-12 space-y-3">
        <h2 className="text-lg font-medium">Projects</h2>
        <p className="text-sm leading-6 text-zinc-400">
          Create a project from an empty canvas or a template. Personal projects stay yours; shared and team
          projects are for collaboration.
        </p>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-medium">Editor</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-400">
          <li>Drag nodes from the library onto the canvas and connect them with edges.</li>
          <li>Use tags and flows to highlight paths through the architecture.</li>
          <li>Open a service to nest an inner diagram for deeper detail.</li>
          <li>Group select with drag or Shift; undo with Ctrl/Cmd+Z.</li>
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-medium">Sharing</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-400">
          <li>Project owners invite people by email as editor or viewer.</li>
          <li>Public link access lets anyone with the link view the diagram without an account.</li>
          <li>Removing a member revokes editor access; turn off the public link to fully revoke view access.</li>
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-medium">Teams</h2>
        <p className="text-sm leading-6 text-zinc-400">
          Create a team from the workspace switcher, invite members, and keep team projects in one place.
          Team members can open team projects without a separate invite per diagram.
        </p>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-medium">Realtime</h2>
        <p className="text-sm leading-6 text-zinc-400">
          Presence avatars, live cursors, and chat update while you are connected. If status shows
          Connecting, check that the realtime WebSocket URL is reachable.
        </p>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-medium">Accounts</h2>
        <p className="text-sm leading-6 text-zinc-400">
          Sign in with email/password, Google, or GitHub. The same email links to one ClusterDeck account
          across those methods.
        </p>
      </section>
    </SiteShell>
  );
}
