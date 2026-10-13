// Repository boundary for studio and stage bookings.
//
// Every query takes the scope (isDemo) of the person asking, like the admin
// views do: demo visitors book on their own calendar and can never see or
// block the forening's real one.

import prisma from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import type { Room } from "@/lib/booking";

const bookingWithUser = {
  user: { select: { id: true, name: true, email: true } },
} as const;

export type SaveBookingResult =
  | { ok: true }
  | { ok: false; reason: "taken" };

type BookingSlot = {
  room: Room;
  startsAt: Date;
  endsAt: Date;
  note: string | null;
  isDemo: boolean;
};

// Checking for a clash and writing run in one serializable transaction, so two
// members clicking at the same moment can't both get the same slot. If
// Postgres detects the race it aborts one of them, which we report as taken.
// `ignoreId` is the booking being edited, which may overlap its own old time.
async function saveWithoutClash(
  slot: BookingSlot,
  ignoreId: string | null,
  write: (tx: Prisma.TransactionClient) => Promise<unknown>,
): Promise<SaveBookingResult> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const clash = await tx.booking.findFirst({
          where: {
            room: slot.room,
            startsAt: { lt: slot.endsAt },
            endsAt: { gt: slot.startsAt },
            user: { isDemo: slot.isDemo },
            ...(ignoreId ? { id: { not: ignoreId } } : {}),
          },
          select: { id: true },
        });
        if (clash) return { ok: false, reason: "taken" } as const;

        await write(tx);
        return { ok: true } as const;
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    // P2034: transaction failed because of a write conflict.
    if ((error as { code?: string }).code === "P2034") {
      return { ok: false, reason: "taken" };
    }
    throw error;
  }
}

export const bookingRepository = {
  // Everything in a room that overlaps [from, to).
  findInRange(room: Room, from: Date, to: Date, isDemo: boolean) {
    return prisma.booking.findMany({
      where: {
        room,
        startsAt: { lt: to },
        endsAt: { gt: from },
        user: { isDemo },
      },
      include: bookingWithUser,
      orderBy: { startsAt: "asc" },
    });
  },

  // A member's own bookings that haven't finished yet, both rooms.
  findUpcomingForUser(userId: string) {
    return prisma.booking.findMany({
      where: { userId, endsAt: { gt: new Date() } },
      orderBy: { startsAt: "asc" },
    });
  },

  findById(id: string) {
    return prisma.booking.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, isDemo: true, name: true, email: true } },
      },
    });
  },

  create(data: BookingSlot & { userId: string }): Promise<SaveBookingResult> {
    return saveWithoutClash(data, null, (tx) =>
      tx.booking.create({
        data: {
          userId: data.userId,
          room: data.room,
          startsAt: data.startsAt,
          endsAt: data.endsAt,
          note: data.note,
        },
      }),
    );
  },

  // Move or change an existing booking. The owner stays the same, even when
  // an admin does the editing.
  update(id: string, data: BookingSlot): Promise<SaveBookingResult> {
    return saveWithoutClash(data, id, (tx) =>
      tx.booking.update({
        where: { id },
        data: {
          room: data.room,
          startsAt: data.startsAt,
          endsAt: data.endsAt,
          note: data.note,
        },
      }),
    );
  },

  delete(id: string) {
    return prisma.booking.delete({ where: { id } });
  },
};
