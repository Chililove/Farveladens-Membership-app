import type { DefaultSession } from "next-auth";

type Role = "MEMBER" | "ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      membershipExpiresAt: Date | null;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/adapters" {
  interface AdapterUser {
    role: Role;
    membershipExpiresAt: Date | null;
  }
}
