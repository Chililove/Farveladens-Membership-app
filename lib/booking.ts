// Studio and stage booking: rooms, rules and Danish-time helpers.
//
// The server runs in UTC (Vercel), but members think in Danish time and the
// clocks change twice a year. Every date the user types or sees goes through
// the helpers below, so "18:00 on the 26th of October" means 18:00 in
// Copenhagen whatever side of the DST switch it falls on.

// Relative imports only, so the demo seed script can load this under tsx.
import { getMembershipStatus } from "./membership";

export const TIME_ZONE = "Europe/Copenhagen";

export type Room = "STUDIO" | "STAGE";

export const ROOMS: { id: Room; label: string }[] = [
  { id: "STUDIO", label: "Studio" },
  { id: "STAGE", label: "Stage" },
];

export function parseRoom(value: unknown): Room | undefined {
  return ROOMS.find((room) => room.id === value)?.id;
}

export function roomLabel(room: Room): string {
  return ROOMS.find((r) => r.id === room)?.label ?? room;
}

// Bookings start and end on the half hour.
export const SLOT_MINUTES = 30;

// Longest optional note a member can add to a booking.
export const NOTE_MAX_LENGTH = 80;

export function hasActiveMembership(user: { membershipExpiresAt: Date | null }) {
  const status = getMembershipStatus(user.membershipExpiresAt);
  return status === "ACTIVE" || status === "EXPIRING_SOON";
}

/**
 * Active and expiring-soon members can book. Admins always can, for events.
 * Demo accounts can too: the demo member starts without a membership so the
 * payment flow can be shown, and booking should still be tryable.
 */
export function canBook(user: {
  role: string;
  membershipExpiresAt: Date | null;
  isDemo: boolean;
}): boolean {
  return user.role === "ADMIN" || user.isDemo || hasActiveMembership(user);
}

// ---- Days as "YYYY-MM-DD" strings in Danish time ----

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDayString(value: unknown): value is string {
  if (typeof value !== "string" || !DAY_PATTERN.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // Rejects things like 2026-02-31 that Date would quietly roll over.
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** The Danish calendar day a moment falls on. */
export function dayKey(date: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function today(): string {
  return dayKey(new Date());
}

function dayToUtcMidnight(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(day: string, days: number): string {
  const date = dayToUtcMidnight(day);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Monday of the week the day falls in. */
export function startOfWeek(day: string): string {
  const weekday = dayToUtcMidnight(day).getUTCDay(); // 0 = Sunday
  return addDays(day, -((weekday + 6) % 7));
}

/** ISO 8601 week number, the one Danish calendars print. */
export function isoWeekNumber(day: string): number {
  const date = dayToUtcMidnight(day);
  const weekday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - weekday + 3); // Thursday of this week
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  return (
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    )
  );
}

// ---- Months as "YYYY-MM" strings ----

export function isMonthString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}$/.test(value) &&
    isDayString(`${value}-01`)
  );
}

export function monthOf(day: string): string {
  return day.slice(0, 7);
}

export function addMonths(month: string, months: number): string {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + months, 1));
  return date.toISOString().slice(0, 7);
}

/**
 * Every day shown in a month grid: from the Monday on or before the 1st to
 * the Sunday on or after the last day, so the grid is always whole weeks.
 */
export function monthGridDays(month: string): string[] {
  const first = `${month}-01`;
  const last = addDays(`${addMonths(month, 1)}-01`, -1);
  const days: string[] = [];
  for (let day = startOfWeek(first); day <= last || days.length % 7 !== 0; day = addDays(day, 1)) {
    days.push(day);
  }
  return days;
}

export function formatMonth(month: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(dayToUtcMidnight(`${month}-01`));
}

// ---- Converting between Danish wall-clock time and real moments ----

/** Minutes Copenhagen is ahead of UTC at a given moment (60 or 120). */
function offsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  const wallClockAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
  );
  return Math.round((wallClockAsUtc - at.getTime()) / 60000);
}

/**
 * The moment a Danish wall-clock time happens. `minutes` counts from midnight
 * and may be 1440, meaning midnight at the end of the day.
 */
export function danishTimeToDate(day: string, minutes: number): Date {
  const [y, m, d] = day.split("-").map(Number);
  const asIfUtc = Date.UTC(y, m - 1, d, 0, minutes);
  const first = offsetMinutes(new Date(asIfUtc));
  const guess = new Date(asIfUtc - first * 60000);
  // Second pass settles times close to a clock change.
  const second = offsetMinutes(guess);
  return second === first ? guess : new Date(asIfUtc - second * 60000);
}

/** "18:00" -> 1080. Only accepts whole slots, up to and including "24:00". */
export function parseTime(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return undefined;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  if (minutes > 24 * 60 || minutes % SLOT_MINUTES !== 0) return undefined;
  return minutes;
}

export function minutesToTime(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/** Every slot boundary in a day, "00:00" to "24:00". */
export function timeOptions(): string[] {
  const options: string[] = [];
  for (let m = 0; m <= 24 * 60; m += SLOT_MINUTES) options.push(minutesToTime(m));
  return options;
}

// ---- Display ----

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

/** "18:00-21:30". A booking ending at midnight reads "24:00", not "00:00". */
export function formatTimeRange(startsAt: Date, endsAt: Date): string {
  const sameDay = dayKey(startsAt) === dayKey(endsAt);
  const end = sameDay ? formatTime(endsAt) : "24:00";
  return `${formatTime(startsAt)}-${end}`;
}

export function formatDay(day: string, weekday: "long" | "short" = "long"): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday,
    day: "numeric",
    month: "long",
  }).format(dayToUtcMidnight(day));
}

/** Members are added by email only, so fall back to a tidied-up local part. */
export function displayName(user: { name: string | null; email: string }): string {
  if (user.name) return user.name;
  return user.email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
