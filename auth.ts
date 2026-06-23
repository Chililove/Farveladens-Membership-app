// =============================================================================
//  AUTH CONFIG  —  the heart of the login system (Auth.js v5)
// =============================================================================
//  This sets up passwordless "magic link" login:
//   - PrismaAdapter stores users/sessions in our database (the Auth.js tables).
//   - The Resend provider emails a one-time sign-in link (no passwords!).
//
//  It exports four things used across the app:
//   - handlers : the GET/POST routes Auth.js needs (used in the route file)
//   - auth     : read the current session in server code  (await auth())
//   - signIn   : start a login (we call it from the login form)
//   - signOut  : log out
// =============================================================================

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import prisma from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      // Until a domain is verified in Resend, this MUST be onboarding@resend.dev
      // (and links only deliver to your own Resend account email). For real
      // members in production, verify a domain and set AUTH_EMAIL_FROM.
      from: process.env.AUTH_EMAIL_FROM ?? "onboarding@resend.dev",
    }),
  ],
  pages: {
    signIn: "/login", // use our own login page instead of the built-in one
  },
  callbacks: {
    // With database sessions, this runs with the full DB user. We copy the
    // fields our pages need (id, role, membership expiry) onto the session.
    session({ session, user }) {
      session.user.id = user.id;
      session.user.role = user.role;
      session.user.membershipExpiresAt = user.membershipExpiresAt;
      return session;
    },
  },
});
