// Demo mode: lets portfolio visitors try the app without receiving a magic-link
// email. Two shared accounts sign in instantly, and the data resets on every
// demo login so each visitor starts from the same clean slate.

// Relative rather than the "@/" alias so the seed script works under tsx too.
import prisma from "./prisma";

export const DEMO_MEMBER_EMAIL = "demo-member@farveladen.demo";
export const DEMO_ADMIN_EMAIL = "demo-admin@farveladen.demo";

// Disable in a real deployment with DEMO_MODE="false".
export const DEMO_ENABLED = process.env.DEMO_MODE !== "false";

export type DemoRole = "MEMBER" | "ADMIN";

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

// Fake roster so the admin panel has something to look at. Each entry covers a
// different membership status so every branch of the UI is visible.
const FAKE_MEMBERS = [
  { email: "astrid.holm@example.dk", expiresInDays: 240, rulesAccepted: true },
  { email: "mikkel.bak@example.dk", expiresInDays: 120, rulesAccepted: true },
  { email: "sofie.krogh@example.dk", expiresInDays: 21, rulesAccepted: true }, // expiring soon
  { email: "jonas.vinter@example.dk", expiresInDays: 5, rulesAccepted: true }, // expiring soon
  { email: "laura.bjerre@example.dk", expiresInDays: -14, rulesAccepted: true }, // expired
  { email: "emil.thorsen@example.dk", expiresInDays: -95, rulesAccepted: true }, // expired
  { email: "nanna.friis@example.dk", expiresInDays: null, rulesAccepted: true }, // never paid
  { email: "oscar.lind@example.dk", expiresInDays: null, rulesAccepted: false }, // never paid, no rules
];

// Fake members who are waiting for an admin to confirm their transfer.
const FAKE_PENDING = [
  { email: "laura.bjerre@example.dk", amountDkk: 600, months: 6 },
  { email: "nanna.friis@example.dk", amountDkk: 100, months: 1 },
  { email: "emil.thorsen@example.dk", amountDkk: 1200, months: 12 },
];

/**
 * Restore the demo dataset to its starting state.
 *
 * Wipes every demo user's payments, resets the shared demo member so a visitor
 * sees the rules gate and an empty membership, and recreates the pending
 * payments the demo admin is meant to confirm. Only touches demo accounts —
 * real members are never affected.
 */
export async function resetDemoData() {
  const demoMember = await prisma.user.upsert({
    where: { email: DEMO_MEMBER_EMAIL },
    update: {
      name: "Demo Member",
      role: "MEMBER",
      // Cleared so each visitor walks through the rules and payment flow.
      rulesAcceptedAt: null,
      membershipExpiresAt: null,
    },
    create: {
      email: DEMO_MEMBER_EMAIL,
      name: "Demo Member",
      role: "MEMBER",
      emailVerified: new Date(),
    },
  });

  const demoAdmin = await prisma.user.upsert({
    where: { email: DEMO_ADMIN_EMAIL },
    update: { name: "Demo Admin", role: "ADMIN", rulesAcceptedAt: new Date() },
    create: {
      email: DEMO_ADMIN_EMAIL,
      name: "Demo Admin",
      role: "ADMIN",
      emailVerified: new Date(),
      rulesAcceptedAt: new Date(),
    },
  });

  const fakeMembers = [];
  for (const member of FAKE_MEMBERS) {
    const expiresAt =
      member.expiresInDays === null ? null : daysFromNow(member.expiresInDays);
    fakeMembers.push(
      await prisma.user.upsert({
        where: { email: member.email },
        update: {
          role: "MEMBER",
          membershipExpiresAt: expiresAt,
          rulesAcceptedAt: member.rulesAccepted ? new Date() : null,
        },
        create: {
          email: member.email,
          role: "MEMBER",
          emailVerified: new Date(),
          membershipExpiresAt: expiresAt,
          rulesAcceptedAt: member.rulesAccepted ? new Date() : null,
        },
      })
    );
  }

  // Clear old payments before recreating them, so confirming a payment in the
  // demo doesn't permanently empty the admin queue for the next visitor.
  const demoUserIds = [demoMember.id, demoAdmin.id, ...fakeMembers.map((m) => m.id)];
  await prisma.payment.deleteMany({ where: { userId: { in: demoUserIds } } });

  for (const pending of FAKE_PENDING) {
    const user = fakeMembers.find((m) => m.email === pending.email);
    if (!user) continue;
    await prisma.payment.create({
      data: {
        userId: user.id,
        amountDkk: pending.amountDkk,
        periodEnd: daysFromNow(pending.months * 30),
        method: "MOBILEPAY",
        status: "PENDING",
      },
    });
  }

  return { demoMember, demoAdmin };
}

/**
 * Reset the demo data and hand back the account for the requested role.
 * Called on every demo sign-in.
 */
export async function startDemoSession(role: DemoRole) {
  const { demoMember, demoAdmin } = await resetDemoData();
  return role === "ADMIN" ? demoAdmin : demoMember;
}
