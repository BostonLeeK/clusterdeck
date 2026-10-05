"use client";

import { useState } from "react";
import { loginUser, oauthSignIn, registerUser } from "@/actions/auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const [error, setError] = useState<string | null>(null);
  const action = mode === "sign-up" ? registerUser : loginUser;

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[#0b0b0d] lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between p-10 lg:flex">
        <Logo />
        <AuthHeroGraph />
        <p className="max-w-md text-[42px] leading-[1.05] font-semibold tracking-tight">
          Map your infrastructure.
          <br />
          Together.
        </p>
      </div>
      <div className="flex items-center justify-center border-l border-[#1e1e22] p-8">
        <div className="w-full max-w-[380px]">
          <h1 className="mb-8 text-center text-[28px] font-semibold tracking-tight">
            {mode === "sign-up" ? "Create your account" : "Sign in"}
          </h1>
          <div className="space-y-2.5">
            <Button className="h-11 w-full rounded-xl" variant="secondary" onClick={() => oauthSignIn("github")}>
              <GitHubIcon /> Continue with GitHub
            </Button>
            <Button className="h-11 w-full rounded-xl" variant="secondary" onClick={() => oauthSignIn("google")}>
              <GoogleIcon /> Continue with Google
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
              const result = await action(formData);
              if (result?.error) setError(result.error);
            }}
          >
            {mode === "sign-up" ? (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" name="name" type="text" placeholder="Bohdan" required className="h-11" />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" name="email" type="email" placeholder="you@company.com" required className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
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
                <a className="text-indigo-400 hover:text-indigo-300" href="/sign-in">
                  Sign in
                </a>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <a className="text-indigo-400 hover:text-indigo-300" href="/sign-up">
                  Create one
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function AuthHeroGraph() {
  return (
    <div className="mx-auto w-[92%] max-w-[560px]">
      <svg viewBox="0 0 560 280" className="w-full">
        <path d="M80 140 C 130 140, 130 60, 200 60" stroke="#3f3f46" fill="none" />
        <path d="M80 140 C 130 140, 130 140, 200 140" stroke="#3f3f46" fill="none" />
        <path d="M80 140 C 130 140, 130 220, 200 220" stroke="#3f3f46" fill="none" />
        <path d="M280 60 C 330 60, 330 90, 380 90" stroke="#3f3f46" fill="none" />
        <path d="M280 140 C 330 140, 330 90, 380 90" stroke="#3f3f46" fill="none" />
        <path d="M280 140 C 330 140, 330 180, 380 180" stroke="#3f3f46" fill="none" />
        <path d="M280 220 C 330 220, 330 180, 380 180" stroke="#3f3f46" fill="none" />
        <path d="M460 90 C 500 90, 500 140, 520 140" stroke="#3f3f46" fill="none" />
        <path d="M460 180 C 500 180, 500 140, 520 140" stroke="#3f3f46" fill="none" />
        <text x="145" y="92" fill="#71717a" fontSize="9">HTTPS</text>
        <text x="145" y="128" fill="#71717a" fontSize="9">gRPC</text>
        <text x="145" y="188" fill="#71717a" fontSize="9">events</text>
        {card(8, 118, "Web client", "entry point", "#a1a1aa")}
        {card(200, 38, "API gateway", "HTTPS · ingress", "#818cf8")}
        {card(200, 118, "Auth service", "gRPC · core", "#818cf8")}
        {card(200, 198, "Event worker", "async · queue", "#34d399")}
        {card(380, 68, "PostgreSQL", "primary data", "#60a5fa")}
        {card(380, 158, "Message queue", "events · Kafka", "#f97316")}
        <circle cx="528" cy="132" r="6" fill="#22c55e" />
        <circle cx="528" cy="148" r="6" fill="none" stroke="#3f3f46" />
      </svg>
    </div>
  );
}

function card(x: number, y: number, title: string, sub: string, color: string) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect width="120" height="44" rx="12" fill="#141416" stroke="#2a2a2e" />
      <circle cx="16" cy="22" r="5" fill={color} />
      <text x="28" y="20" fill="#e4e4e7" fontSize="11" fontFamily="Inter, system-ui">
        {title}
      </text>
      <text x="28" y="34" fill="#71717a" fontSize="9" fontFamily="Inter, system-ui">
        {sub}
      </text>
    </g>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 fill-current">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.65 7.65 0 0 1 8 4.77c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4">
      <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.6S8.9 6.2 12 6.2c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.7 3.7 14.6 2.8 12 2.8 6.9 2.8 2.8 6.9 2.8 12S6.9 21.2 12 21.2c5.3 0 8.8-3.7 8.8-9 0-.6 0-1-.1-1.5H12z" />
    </svg>
  );
}
