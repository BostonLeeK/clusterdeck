import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { verify } from "@node-rs/argon2";
import { db, accounts, sessions, users, verificationTokens } from "@dataflow/db";
import { ensureOAuthAccountLinked, resolveCanonicalUserByEmail } from "@/lib/account-merge";
import { acceptPendingInvites } from "@/lib/invites";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    ...(process.env.AUTH_GITHUB_ID
      ? [
          GitHub({
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(process.env.AUTH_GOOGLE_ID
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials.password ?? "");
        if (!email || !password) return null;
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user?.passwordHash) return null;
        if (!user.emailVerified) return null;
        const ok = await verify(user.passwordHash, password);
        if (!ok) return null;
        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  events: {
    async signIn({ user, account }) {
      if (!user.email) return;
      const canonical = await resolveCanonicalUserByEmail(user.email, {
        id: user.id,
        name: user.name,
        image: user.image,
        emailVerified: account?.provider && account.provider !== "credentials" ? true : undefined,
      });
      if (!canonical) return;

      if (account?.provider && account.provider !== "credentials" && account.providerAccountId) {
        await ensureOAuthAccountLinked({
          userId: canonical.id,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          type: account.type,
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          expires_at: account.expires_at,
          token_type: account.token_type,
          scope: account.scope,
          id_token: account.id_token,
        });
      }

      await acceptPendingInvites(user.email, canonical.id);
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return true;
      const canonical = await resolveCanonicalUserByEmail(user.email, {
        id: user.id,
        name: user.name,
        image: user.image,
        emailVerified: account?.provider && account.provider !== "credentials" ? true : undefined,
      });
      if (canonical) {
        user.id = canonical.id;
        user.name = canonical.name;
        user.image = canonical.image;
        user.email = canonical.email;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user?.email) {
        const canonical = await resolveCanonicalUserByEmail(user.email, {
          id: user.id,
          name: user.name,
          image: user.image,
          emailVerified: account?.provider && account.provider !== "credentials" ? true : undefined,
        });
        if (canonical) {
          token.sub = canonical.id;
          token.email = canonical.email;
          if (canonical.name) token.name = canonical.name;
          if (canonical.image) token.picture = canonical.image;
          return token;
        }
      }
      if (user?.id) {
        token.sub = user.id;
        if (user.email) token.email = user.email;
        if (user.name) token.name = user.name;
        if (user.image) token.picture = user.image;
        return token;
      }
      if (token.sub) {
        const [byId] = await db.select({ id: users.id }).from(users).where(eq(users.id, token.sub)).limit(1);
        if (byId) return token;
      }
      const email = typeof token.email === "string" ? token.email.trim().toLowerCase() : "";
      if (email) {
        const canonical = await resolveCanonicalUserByEmail(email);
        if (canonical) token.sub = canonical.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        if (typeof token.name === "string") session.user.name = token.name;
        if (typeof token.picture === "string") session.user.image = token.picture;
        if (typeof token.email === "string") session.user.email = token.email;
      }
      return session;
    },
  },
});
