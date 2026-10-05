import { redirect } from "next/navigation";
import { verifyEmailToken } from "@/actions/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <AuthShell>
        <h1 className="mb-3 text-center text-[28px] font-semibold tracking-tight">Invalid link</h1>
        <p className="mb-6 text-center text-sm text-zinc-400">This confirmation link is missing a token.</p>
        <a href="/sign-in">
          <Button className="h-11 w-full rounded-xl">Back to sign in</Button>
        </a>
      </AuthShell>
    );
  }

  const result = await verifyEmailToken(token);
  if (result.error) {
    return (
      <AuthShell>
        <h1 className="mb-3 text-center text-[28px] font-semibold tracking-tight">Link expired</h1>
        <p className="mb-6 text-center text-sm text-zinc-400">{result.error}</p>
        <a href="/sign-up">
          <Button className="h-11 w-full rounded-xl" variant="secondary">
            Create account again
          </Button>
        </a>
        <p className="mt-4 text-center text-sm text-zinc-500">
          <a className="text-indigo-400 hover:text-indigo-300" href="/sign-in">
            Back to sign in
          </a>
        </p>
      </AuthShell>
    );
  }

  redirect("/sign-in?verified=1");
}
