"use client";

import { useState } from "react";
import { requestPasswordReset } from "@/actions/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  return (
    <AuthShell>
      <h1 className="mb-3 text-center text-[28px] font-semibold tracking-tight">Forgot password</h1>
      <p className="mb-6 text-center text-sm leading-6 text-zinc-400">
        Enter your email and we’ll send a reset link if an account exists.
      </p>
      {sent ? (
        <>
          <p className="mb-6 text-center text-sm text-emerald-400">
            If that email is registered, a reset link is on its way.
          </p>
          <a href="/sign-in">
            <Button className="h-11 w-full rounded-xl">Back to sign in</Button>
          </a>
        </>
      ) : (
        <form
          className="space-y-4"
          action={async (formData) => {
            setError(null);
            const result = await requestPasswordReset(formData);
            if (result?.error) setError(result.error);
            else setSent(true);
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" name="email" type="email" placeholder="you@company.com" required className="h-11" />
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <Button className="h-11 w-full rounded-xl" type="submit">
            Send reset link
          </Button>
          <p className="text-center text-sm text-zinc-500">
            <a className="text-indigo-400 hover:text-indigo-300" href="/sign-in">
              Back to sign in
            </a>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
