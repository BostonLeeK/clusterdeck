import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, users } from "@dataflow/db";
import { AuthForm } from "@/components/auth/auth-form";
import { auth } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/urls";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; callbackUrl?: string; invite?: string }>;
}) {
  const params = await searchParams;
  const invitePath = params.invite ? `/invite/${params.invite}` : undefined;
  const callbackUrl = safeCallbackUrl(params.callbackUrl ?? invitePath);
  const session = await auth();
  if (session?.user?.id) redirect(callbackUrl);

  const email = params.email?.trim().toLowerCase();
  if (email && invitePath) {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      redirect(
        `/sign-in?callbackUrl=${encodeURIComponent(invitePath)}&email=${encodeURIComponent(email)}`,
      );
    }
  }

  return <AuthForm mode="sign-up" defaultEmail={params.email} callbackUrl={callbackUrl} />;
}
