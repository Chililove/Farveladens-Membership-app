import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { DEMO_ENABLED, startDemoSession, type DemoRole } from "@/lib/demo";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Credentials-based demo sign-in requires JWT sessions rather than the
  // adapter's database sessions. Role and expiry are still read fresh from the
  // database on every request (see the session callback), so nothing goes stale.
  session: { strategy: "jwt" },
  providers: [
    Resend({
      // onboarding@resend.dev only delivers to your own Resend account email;
      // verify a domain and set AUTH_EMAIL_FROM for production.
      from: process.env.AUTH_EMAIL_FROM ?? "onboarding@resend.dev",
    }),
    // Portfolio demo login. Takes nothing but a role and can only ever return
    // one of the two fixed demo accounts, so no arbitrary email can sign in
    // through it.
    Credentials({
      id: "demo",
      name: "Demo",
      credentials: { role: { label: "Role", type: "text" } },
      async authorize(credentials) {
        if (!DEMO_ENABLED) return null;
        const role: DemoRole =
          credentials?.role === "ADMIN" ? "ADMIN" : "MEMBER";
        const user = await startDemoSession(role);
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  pages: {
    signIn: "/login",
    // Send rejected sign-ins back to the login page rather than Auth.js's
    // default error screen, so the message appears in context.
    error: "/login",
  },
  callbacks: {
    // Membership is invite-only: an admin adds the email first, then that
    // person can request a login link. Without this, Auth.js would happily
    // create an account for any address typed into the form.
    async signIn({ user, account }) {
      // The demo provider can only ever return one of the two demo accounts,
      // and it creates them itself, so it doesn't need the allowlist check.
      if (account?.provider === "demo") return true;

      const email = user.email?.toLowerCase();
      if (!email) return false;

      const existing = await prisma.user.findUnique({ where: { email } });
      return Boolean(existing);
    },

    // With JWT sessions the token only carries the user id, so the custom
    // fields are read from the database each time. That keeps role and
    // membership expiry correct immediately after an admin confirms a payment.
    async session({ session, token }) {
      if (!token.sub) return session;
      session.user.id = token.sub;

      const dbUser = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { id: true, email: true, role: true, membershipExpiresAt: true },
      });
      if (dbUser) {
        session.user.email = dbUser.email;
        session.user.role = dbUser.role;
        session.user.membershipExpiresAt = dbUser.membershipExpiresAt;
      }
      return session;
    },
  },
});
