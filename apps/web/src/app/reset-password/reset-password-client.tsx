"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/actions/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <AuthShell>
        <h1 className="mb-3 text-center text-[28px] font-semibold tracking-tight">Invalid link</h1>
        <p className="mb-6 text-center text-sm text-zinc-400">This reset link is missing a token.</p>
        <a href="/forgot-password">
          <Button className="h-11 w-full rounded-xl">Request a new link</Button>
        </a>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="mb-3 text-center text-[28px] font-semibold tracking-tight">Choose a new password</h1>
      <p className="mb-6 text-center text-sm text-zinc-400">Use at least 8 characters.</p>
      <form
        className="space-y-4"
        action={async (formData) => {
          setError(null);
          formData.set("token", token);
          const result = await resetPassword(formData);
          if (result?.error) {
            setError(result.error);
            return;
          }
          router.push("/sign-in?reset=1");
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <Input id="password" name="password" type="password" required minLength={8} className="h-11" />
        </div>
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
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <Button className="h-11 w-full rounded-xl" type="submit">
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}
