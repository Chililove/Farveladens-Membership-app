// Demo mode: lets portfolio visitors try the app without receiving a magic-link
// email. Two shared accounts sign in instantly.
//
// "Try as member" starts a fresh journey and wipes the previous visitor's work.
// "Try as admin" deliberately does not, so a visitor can register a payment as
// the member, switch to admin, and confirm it. That round trip is the whole
// point of the app, so the demo has to be able to show it.

// Relative rather than the "@/" alias so the seed script works under tsx too.
import prisma from "./prisma";
import { addDays, danishTimeToDate, today, type Room } from "./booking";

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

// Fixed ids rather than generated ones, so fake members and their payments can
// be inserted in bulk without a round trip in between to look the ids up.
const FAKE_MEMBERS = [
  { id: "demo-astrid", name: "Astrid Holm", email: "astrid.holm@example.dk", expiresInDays: 240, rulesAccepted: true },
  { id: "demo-mikkel", name: "Mikkel Bak", email: "mikkel.bak@example.dk", expiresInDays: 120, rulesAccepted: true },
  { id: "demo-sofie", name: "Sofie Krogh", email: "sofie.krogh@example.dk", expiresInDays: 21, rulesAccepted: true },
  { id: "demo-jonas", name: "Jonas Vinter", email: "jonas.vinter@example.dk", expiresInDays: 5, rulesAccepted: true },
  { id: "demo-laura", name: "Laura Bjerre", email: "laura.bjerre@example.dk", expiresInDays: -14, rulesAccepted: true },
  { id: "demo-emil", name: "Emil Thorsen", email: "emil.thorsen@example.dk", expiresInDays: -95, rulesAccepted: true },
  { id: "demo-nanna", name: "Nanna Friis", email: "nanna.friis@example.dk", expiresInDays: null, rulesAccepted: true },
  { id: "demo-oscar", name: null, email: "oscar.lind@example.dk", expiresInDays: null, rulesAccepted: false },
];

// Fake members waiting for an admin to confirm their transfer.
const FAKE_PENDING = [
  { id: "demo-pay-laura", userId: "demo-laura", amountDkk: 600, months: 6 },
  { id: "demo-pay-nanna", userId: "demo-nanna", amountDkk: 100, months: 1 },
  { id: "demo-pay-emil", userId: "demo-emil", amountDkk: 1200, months: 12 },
];

// Fake studio and stage bookings over the coming days, so the calendar has
// something on it. Days are counted from today; times are Danish time.
const FAKE_BOOKINGS: {
  id: string;
  userId: string;
  room: Room;
  inDays: number;
  from: number; // hour
  to: number;
  note: string | null;
}[] = [
  { id: "demo-book-1", userId: "demo-astrid", room: "STUDIO", inDays: 1, from: 17, to: 20, note: "Mixing the EP" },
  { id: "demo-book-2", userId: "demo-mikkel", room: "STAGE", inDays: 1, from: 18, to: 22, note: "Band rehearsal" },
  { id: "demo-book-3", userId: "demo-sofie", room: "STUDIO", inDays: 2, from: 10, to: 13, note: "Recording vocals" },
  { id: "demo-book-4", userId: "demo-jonas", room: "STAGE", inDays: 3, from: 19, to: 22, note: "Gig practice" },
  { id: "demo-book-5", userId: "demo-mikkel", room: "STUDIO", inDays: 4, from: 16, to: 18, note: null },
  { id: "demo-book-6", userId: "demo-astrid", room: "STAGE", inDays: 5, from: 14, to: 17, note: "Choir" },
];

const FAKE_IDS = FAKE_MEMBERS.map((m) => m.id);

function fakeMemberRows() {
  return FAKE_MEMBERS.map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    role: "MEMBER" as const,
    emailVerified: new Date(),
    isDemo: true,
    membershipExpiresAt:
      member.expiresInDays === null ? null : daysFromNow(member.expiresInDays),
    rulesAcceptedAt: member.rulesAccepted ? new Date() : null,
  }));
}

function fakePaymentRows() {
  return FAKE_PENDING.map((pending) => ({
    id: pending.id,
    userId: pending.userId,
    amountDkk: pending.amountDkk,
    periodEnd: daysFromNow(pending.months * 30),
    method: "MOBILEPAY" as const,
    status: "PENDING" as const,
  }));
}

function fakeBookingRows() {
  const start = today();
  return FAKE_BOOKINGS.map((booking) => {
    const day = addDays(start, booking.inDays);
    return {
      id: booking.id,
      userId: booking.userId,
      room: booking.room,
      startsAt: danishTimeToDate(day, booking.from * 60),
      endsAt: danishTimeToDate(day, booking.to * 60),
      note: booking.note,
    };
  });
}

/** The two fixed accounts. Upserted so their ids survive between resets. */
async function ensureDemoAccounts() {
  const [demoMember, demoAdmin] = await Promise.all([
    prisma.user.upsert({
      where: { email: DEMO_MEMBER_EMAIL },
      update: {},
      create: {
        email: DEMO_MEMBER_EMAIL,
        name: "Demo Member",
        role: "MEMBER",
        emailVerified: new Date(),
        isDemo: true,
      },
    }),
    prisma.user.upsert({
      where: { email: DEMO_ADMIN_EMAIL },
      update: {},
      create: {
        email: DEMO_ADMIN_EMAIL,
        name: "Demo Admin",
        role: "ADMIN",
        emailVerified: new Date(),
        rulesAcceptedAt: new Date(),
        isDemo: true,
      },
    }),
  ]);

  return { demoMember, demoAdmin };
}

/**
 * Full reset, run when a visitor starts as a member.
 *
 * Clears the demo member back to square one so they see the rules gate and an
 * empty membership, removes anyone a previous visitor invented through the
 * admin form, and rebuilds the fake roster and its pending payments.
 *
 * Batched into a single transaction: the old version made roughly fifteen
 * sequential round trips, which was several seconds of waiting on a click.
 */
export async function resetDemoData() {
  const { demoMember, demoAdmin } = await ensureDemoAccounts();

  await prisma.$transaction([
    // Anything demo-flagged that isn't one of the two fixed accounts, including
    // members a visitor added through the admin panel. Payments cascade.
    prisma.user.deleteMany({
      where: { isDemo: true, id: { notIn: [demoMember.id, demoAdmin.id] } },
    }),
    prisma.payment.deleteMany({
      where: { userId: { in: [demoMember.id, demoAdmin.id] } },
    }),
    prisma.booking.deleteMany({
      where: { userId: { in: [demoMember.id, demoAdmin.id] } },
    }),
    prisma.user.update({
      where: { id: demoMember.id },
      data: {
        // No name and no rules: visitors go through onboarding like a new member.
        name: null,
        role: "MEMBER",
        rulesAcceptedAt: null,
        membershipExpiresAt: null,
      },
    }),
    prisma.user.createMany({ data: fakeMemberRows() }),
    prisma.payment.createMany({ data: fakePaymentRows() }),
    prisma.booking.createMany({ data: fakeBookingRows() }),
  ]);

  return { demoMember, demoAdmin };
}

/**
 * Lighter pass, run when a visitor starts as an admin.
 *
 * Deliberately leaves the demo member alone, so a payment they registered a
 * moment ago is still waiting to be confirmed. Only restores the fake roster
 * and pending payments if a previous visitor cleared them out.
 */
export async function topUpDemoData() {
  const { demoMember, demoAdmin } = await ensureDemoAccounts();

  const [fakeCount, fakePending] = await Promise.all([
    prisma.user.count({ where: { id: { in: FAKE_IDS } } }),
    prisma.payment.count({ where: { id: { in: FAKE_PENDING.map((p) => p.id) } } }),
  ]);

  if (fakeCount < FAKE_MEMBERS.length) {
    // skipDuplicates so this is safe whether some, none or all are missing.
    await prisma.user.createMany({
      data: fakeMemberRows(),
      skipDuplicates: true,
    });
  }

  if (fakePending < FAKE_PENDING.length) {
    await prisma.payment.createMany({
      data: fakePaymentRows(),
      skipDuplicates: true,
    });
  }

  // Fake bookings deleted by a visitor are left alone here: they'd come back
  // with fresh dates on the next member reset anyway.
  return { demoMember, demoAdmin };
}

/**
 * Prepare the demo and hand back the account for the requested role.
 * Called on every demo sign-in.
 */
export async function startDemoSession(role: DemoRole) {
  const { demoMember, demoAdmin } =
    role === "ADMIN" ? await topUpDemoData() : await resetDemoData();

  return role === "ADMIN" ? demoAdmin : demoMember;
}
