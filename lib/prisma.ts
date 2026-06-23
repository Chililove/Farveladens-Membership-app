// =============================================================================
//  PRISMA CLIENT  —  one shared database connection (Singleton + pg adapter)
// =============================================================================
//  Same pattern as the other projects: create ONE Prisma client and reuse it.
//  The `globalForPrisma` trick stops Next.js's dev hot-reload from opening a
//  new connection on every file save.
//
//  The PrismaClient import comes from the generated folder (with "/client" at
//  the end). That folder is created when you run a migration or
//  `npx prisma generate`, so the editor may underline it red until then.
// =============================================================================

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
