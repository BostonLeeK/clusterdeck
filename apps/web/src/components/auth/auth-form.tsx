"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import {
  loginUser,
  oauthSignIn,
  registerUser,
  resendVerificationEmail,
} from "@/actions/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function AuthForm({
  mode,
  notice,
  defaultEmail,
  callbackUrl = "/projects",
}: {
  mode: "sign-in" | "sign-up";
  notice?: string | null;
  defaultEmail?: string;
  callbackUrl?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(notice ?? null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const action = mode === "sign-up" ? registerUser : loginUser;

  if (pendingEmail) {
    return (
      <AuthShell>
        <h1 className="mb-3 text-center text-[28px] font-semibold tracking-tight">Check your email</h1>
        <p className="mb-6 text-center text-sm leading-6 text-zinc-400">
          We sent a confirmation link to <span className="text-zinc-200">{pendingEmail}</span>. Confirm it
          before signing in.
        </p>
        {info ? <p className="mb-3 text-center text-sm text-emerald-400">{info}</p> : null}
        {error ? <p className="mb-3 text-center text-sm text-red-400">{error}</p> : null}
        <form
          className="space-y-3"
          action={async () => {
            setError(null);
            setInfo(null);
            const formData = new FormData();
            formData.set("email", pendingEmail);
            const result = await resendVerificationEmail(formData);
            if (result?.error) setError(result.error);
            else setInfo("Confirmation email sent again.");
          }}
        >
          <Button className="h-11 w-full rounded-xl" variant="secondary" type="submit">
            Resend confirmation email
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-500">
          <a className="text-indigo-400 hover:text-indigo-300" href="/sign-in">
            Back to sign in
          </a>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="mb-8 text-center text-[28px] font-semibold tracking-tight">
        {mode === "sign-up" ? "Create your account" : "Sign in"}
      </h1>
      {info ? <p className="mb-4 text-center text-sm text-emerald-400">{info}</p> : null}
      <div className="space-y-2.5">
        <Button
          className="h-11 w-full rounded-xl"
          variant="secondary"
          onClick={() => oauthSignIn("github", callbackUrl)}
        >
          <Icon icon="simple-icons:github" className="size-4" />
          Continue with GitHub
        </Button>
        <Button
          className="h-11 w-full rounded-xl"
          variant="secondary"
          onClick={() => oauthSignIn("google", callbackUrl)}
        >
          <Icon icon="simple-icons:google" className="size-4" />
          Continue with Google
        </Button>
      </div>
      <div className="my-6 flex items-center gap-3 text-xs text-zinc-500">
        <span className="h-px flex-1 bg-[#2a2a2e]" />
        or continue with email
        <span className="h-px flex-1 bg-[#2a2a2e]" />
      </div>
      <form
        className="space-y-4"
        action={async (formData) => {
          setError(null);
          setInfo(null);
          formData.set("callbackUrl", callbackUrl);
          const result = await action(formData);
          if (result && "needsVerification" in result && result.needsVerification && result.email) {
            setPendingEmail(result.email);
            return;
          }
          if (result?.error) setError(result.error);
        }}
      >
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        {mode === "sign-up" ? (
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" type="text" placeholder="Bohdan" required className="h-11" />
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@company.com"
            required
            className="h-11"
            defaultValue={defaultEmail}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="password">Password</Label>
            {mode === "sign-in" ? (
              <a href="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300">
                Forgot password?
              </a>
            ) : null}
          </div>
          <Input id="password" name="password" type="password" required minLength={8} className="h-11" />
        </div>
        {mode === "sign-up" ? (
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              className="h-11"
            />
          </div>
        ) : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <Button className="h-11 w-full rounded-xl" type="submit">
          {mode === "sign-up" ? "Create account" : "Sign in"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">
        {mode === "sign-up" ? (
          <>
            Already have an account?{" "}
            <a
              className="text-indigo-400 hover:text-indigo-300"
              href={`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            >
              Sign in
            </a>
          </>
        ) : (
          <>
            Don&apos;t have an account?{" "}
            <a
              className="text-indigo-400 hover:text-indigo-300"
              href={`/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            >
              Create one
            </a>
          </>
        )}
      </p>
    </AuthShell>
  );
}
