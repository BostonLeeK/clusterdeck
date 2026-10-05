import { Suspense } from "react";
import ResetPasswordClient from "./reset-password-client";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#0b0b0d] text-zinc-500">Loading…</div>}>
      <ResetPasswordClient />
    </Suspense>
  );
}
