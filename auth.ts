import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import prisma from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      // onboarding@resend.dev only delivers to your own Resend account email;
      // verify a domain and set AUTH_EMAIL_FROM for production.
      from: process.env.AUTH_EMAIL_FROM ?? "onboarding@resend.dev",
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Copy our custom DB user fields onto the session for use across the app.
    session({ session, user }) {
      session.user.id = user.id;
      session.user.role = user.role;
      session.user.membershipExpiresAt = user.membershipExpiresAt;
      return session;
    },
  },
});
