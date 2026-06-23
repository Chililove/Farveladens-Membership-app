// =============================================================================
//  TYPE AUGMENTATION  —  teach TypeScript about our extra user fields
// =============================================================================
//  Auth.js doesn't know about our custom columns (role, membershipExpiresAt).
//  These "module augmentations" extend its built-in types so the rest of the
//  app gets autocomplete and type-safety for them — no casting needed.
// =============================================================================

import type { DefaultSession } from "next-auth";

type Role = "MEMBER" | "ADMIN";

declare module "next-auth" {
  // What `await auth()` returns: session.user now includes our fields.
  interface Session {
    user: {
      id: string;
      role: Role;
      membershipExpiresAt: Date | null;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/adapters" {
  // The database user Auth.js loads now carries our fields too.
  interface AdapterUser {
    role: Role;
    membershipExpiresAt: Date | null;
  }
}
