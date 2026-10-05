import { AuthForm } from "@/components/auth/auth-form";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email : undefined;
  return <AuthForm mode="sign-up" defaultEmail={email} />;
}
