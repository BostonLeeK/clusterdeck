import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { auth } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/urls";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; reset?: string; callbackUrl?: string; email?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);
  const session = await auth();
  if (session?.user?.id) redirect(callbackUrl);

  const notice =
    params.verified === "1"
      ? "Email confirmed. You can sign in now."
      : params.reset === "1"
        ? "Password updated. You can sign in now."
        : null;

  return (
    <AuthForm mode="sign-in" notice={notice} defaultEmail={params.email} callbackUrl={callbackUrl} />
  );
}
