-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- Backfill the demo accounts and sample members seeded before this column
-- existed, so the first reset can clean them up properly.
UPDATE "User"
SET "isDemo" = true
WHERE "email" LIKE '%@farveladen.demo'
   OR "email" LIKE '%@example.dk';
