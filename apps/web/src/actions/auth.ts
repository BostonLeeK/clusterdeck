"use server";

import { hash } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { db, users } from "@dataflow/db";
import { signIn, signOut } from "@/lib/auth";
import {
  RESET_TTL_MS,
  VERIFY_TTL_MS,
  consumeAuthTokenByValue,
  createAuthToken,
  peekAuthTokenByValue,
  resetIdentifier,
  verifyIdentifier,
} from "@/lib/auth-tokens";
import { appBaseUrl, emailConfigured, sendEmail } from "@/lib/email";
import { passwordResetEmailHtml, verificationEmailHtml } from "@/lib/email-templates";

const argon = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

async function sendVerificationEmail(email: string, name: string) {
  if (!emailConfigured()) {
    throw new Error("Email is not configured. Set RESEND_API_KEY and EMAIL_FROM.");
  }
  const { token } = await createAuthToken(verifyIdentifier(email), VERIFY_TTL_MS);
  const verifyUrl = `${appBaseUrl()}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Confirm your ClusterDeck email",
    html: verificationEmailHtml({ name, verifyUrl }),
  });
}

export async function registerUser(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!name) {
    return { error: "Name is required." };
  }
  if (!email || password.length < 8) {
    return { error: "Email and a password of at least 8 characters are required." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing?.emailVerified) return { error: "An account with this email already exists." };
  if (existing && !existing.emailVerified) {
    await db
      .update(users)
      .set({
        name,
        passwordHash: await hash(password, argon),
      })
      .where(eq(users.id, existing.id));
    try {
      await sendVerificationEmail(email, name);
    } catch {
      return { error: "Account updated, but we couldn’t send the confirmation email. Try again later." };
    }
    return { ok: true as const, needsVerification: true as const, email };
  }

  await db.insert(users).values({
    email,
    name,
    passwordHash: await hash(password, argon),
  });

  try {
    await sendVerificationEmail(email, name);
  } catch {
    return { error: "Account created, but we couldn’t send the confirmation email. Try again later." };
  }

  return { ok: true as const, needsVerification: true as const, email };
}

export async function loginUser(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (user?.passwordHash && !user.emailVerified) {
    return {
      error: "Please confirm your email before signing in.",
      needsVerification: true as const,
      email,
    };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: String(formData.get("callbackUrl") ?? "/projects"),
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: "Invalid email or password." };
    throw error;
  }
}

export async function resendVerificationEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return { error: "Email is required." };

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user?.passwordHash) {
    return { ok: true as const };
  }
  if (user.emailVerified) {
    return { error: "This email is already confirmed. You can sign in." };
  }

  try {
    await sendVerificationEmail(email, user.name ?? email);
  } catch {
    return { error: "Couldn’t send the confirmation email. Try again later." };
  }
  return { ok: true as const };
}

export async function verifyEmailToken(token: string) {
  const row = await consumeAuthTokenByValue(token);
  if (!row || !row.identifier.startsWith("verify:")) {
    return { error: "This confirmation link is invalid or has expired." };
  }
  const email = row.identifier.slice("verify:".length);
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return { error: "Account not found." };

  await db.update(users).set({ emailVerified: new Date() }).where(eq(users.id, user.id));
  return { ok: true as const, email };
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return { error: "Email is required." };

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (user?.passwordHash) {
    try {
      if (!emailConfigured()) {
        return { error: "Email is not configured. Set RESEND_API_KEY and EMAIL_FROM." };
      }
      const { token } = await createAuthToken(resetIdentifier(email), RESET_TTL_MS);
      const resetUrl = `${appBaseUrl()}/reset-password?token=${token}`;
      await sendEmail({
        to: email,
        subject: "Reset your ClusterDeck password",
        html: passwordResetEmailHtml({ name: user.name ?? "", resetUrl }),
      });
    } catch {
      return { error: "Couldn’t send the reset email. Try again later." };
    }
  }

  return { ok: true as const };
}

export async function resetPassword(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) return { error: "Reset token is missing." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirmPassword) return { error: "Passwords do not match." };

  const row = await consumeAuthTokenByValue(token);
  if (!row || !row.identifier.startsWith("reset:")) {
    return { error: "This reset link is invalid or has expired." };
  }
  const email = row.identifier.slice("reset:".length);
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return { error: "Account not found." };

  await db
    .update(users)
    .set({
      passwordHash: await hash(password, argon),
      emailVerified: user.emailVerified ?? new Date(),
    })
    .where(eq(users.id, user.id));

  return { ok: true as const };
}

export async function getResetTokenState(token: string) {
  const row = await peekAuthTokenByValue(token);
  if (!row || !row.identifier.startsWith("reset:")) return { valid: false as const };
  return { valid: true as const };
}

export async function oauthSignIn(provider: "github" | "google") {
  await signIn(provider, { redirectTo: "/projects" });
}

export async function logout() {
  await signOut({ redirectTo: "/sign-in" });
}
