// Create (or reset) the demo accounts and fake member data.
// Run: npx tsx scripts/seed-demo.ts
//
// Not required for the app to work - every demo login resets the data itself.
// Useful for populating the database up front so the admin panel isn't empty
// the first time someone opens it.

import "dotenv/config";
import prisma from "../lib/prisma";
import { resetDemoData, DEMO_MEMBER_EMAIL, DEMO_ADMIN_EMAIL } from "../lib/demo";

async function main() {
  await resetDemoData();

  const members = await prisma.user.count();
  const pending = await prisma.payment.count({ where: { status: "PENDING" } });

  console.log("✅ Demo data ready.");
  console.log(`   Member account: ${DEMO_MEMBER_EMAIL}`);
  console.log(`   Admin account:  ${DEMO_ADMIN_EMAIL}`);
  console.log(`   ${members} users, ${pending} payments awaiting confirmation.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
