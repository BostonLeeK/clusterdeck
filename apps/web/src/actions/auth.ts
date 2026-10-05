"use server";

import { hash } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { db, users } from "@dataflow/db";
import { signIn, signOut } from "@/lib/auth";

const argon = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

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
  if (existing) return { error: "An account with this email already exists." };

  await db.insert(users).values({
    email,
    name,
    passwordHash: await hash(password, argon),
  });
  await signIn("credentials", { email, password, redirectTo: "/projects" });
}

export async function loginUser(formData: FormData) {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: String(formData.get("callbackUrl") ?? "/projects"),
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: "Invalid email or password." };
    throw error;
  }
}

export async function oauthSignIn(provider: "github" | "google") {
  await signIn(provider, { redirectTo: "/projects" });
}

export async function logout() {
  await signOut({ redirectTo: "/sign-in" });
}
