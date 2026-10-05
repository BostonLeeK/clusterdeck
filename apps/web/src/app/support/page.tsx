import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "Support · ClusterDeck",
  description: "Get help with ClusterDeck accounts, projects, and collaboration.",
};

const supportEmail = "support@clusterdeck.space";

export default function SupportPage() {
  return (
    <SiteShell active="support">
      <p className="text-[11px] tracking-[0.16em] text-zinc-500 uppercase">Support</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">How can we help?</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-400">
        For account issues, billing questions, or product bugs, reach us by email. We usually reply within one
        business day.
      </p>

      <div className="mt-10 rounded-2xl border border-[#1e1e22] bg-[#121214] p-5">
        <div className="text-sm text-zinc-500">Email</div>
        <a
          href={`mailto:${supportEmail}`}
          className="mt-1 inline-block text-lg font-medium text-indigo-300 hover:text-indigo-200"
        >
          {supportEmail}
        </a>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          Include your account email and a short description of the problem. Screenshots help for editor issues.
        </p>
      </div>

      <section className="mt-12 space-y-6">
        <h2 className="text-lg font-medium">Common questions</h2>

        <div>
          <h3 className="text-sm font-medium text-zinc-200">I didn’t get a verification or invite email</h3>
          <p className="mt-1.5 text-sm leading-6 text-zinc-400">
            Check spam, then try resend from the sign-in screen. Make sure you use the same email the invite was
            sent to.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-zinc-200">Someone still sees my project after I removed them</h3>
          <p className="mt-1.5 text-sm leading-6 text-zinc-400">
            Removing a member stops editor access. If public link sharing is on, turn it off in Share — that link
            is separate from invites.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-zinc-200">Google / GitHub and password login</h3>
          <p className="mt-1.5 text-sm leading-6 text-zinc-400">
            Signing in with the same email merges into one account. You can also set a password later via Forgot
            password.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-zinc-200">Want product docs?</h3>
          <p className="mt-1.5 text-sm leading-6 text-zinc-400">
            Start with the{" "}
            <Link href="/docs" className="text-indigo-300 hover:text-indigo-200">
              docs
            </Link>{" "}
            overview for projects, sharing, and teams.
          </p>
        </div>
      </section>
    </SiteShell>
  );
}
