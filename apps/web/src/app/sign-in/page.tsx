import { AuthForm } from "@/components/auth/auth-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; reset?: string }>;
}) {
  const params = await searchParams;
  const notice =
    params.verified === "1"
      ? "Email confirmed. You can sign in now."
      : params.reset === "1"
        ? "Password updated. You can sign in now."
        : null;

  return <AuthForm mode="sign-in" notice={notice} />;
}
