// Studio and stage booking. Any signed-in member can see the calendar;
// members with an active membership (and admins) can book and cancel.
//
// Linked from the forening's website as /booking. Visitors without a session
// are sent to log in and brought straight back here afterwards.
//
// Two views of the same data: a week (the default, where you book and cancel)
// and a month overview. Everything the page shows lives in the URL, so a view
// can be bookmarked or shared and the back button behaves.

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { membershipRepository } from "@/lib/repositories/membershipRepository";
import { needsOnboarding, onboardingUrl } from "@/lib/onboarding";
import { bookingRepository } from "@/lib/repositories/bookingRepository";
import {
  ROOMS,
  NOTE_MAX_LENGTH,
  type Room,
  addDays,
  addMonths,
  canBook,
  danishTimeToDate,
  dayKey,
  displayName,
  formatDay,
  formatMonth,
  formatTime,
  formatTimeRange,
  hasActiveMembership,
  isDayString,
  isMonthString,
  isoWeekNumber,
  monthGridDays,
  monthOf,
  parseRoom,
  parseTime,
  roomLabel,
  startOfWeek,
  timeOptions,
  today,
} from "@/lib/booking";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  inactive:
    "Your membership isn't active, so you can't book right now. Renew it on your dashboard.",
  invalid: "Something was off with that booking. Check the date and times.",
  order: "The end time has to be after the start time.",
  past: "That time has already passed.",
  taken:
    "Someone has already booked part of that time. Have a look at the calendar and pick another slot.",
  "not-allowed": "You can only cancel your own bookings.",
  gone: "That booking doesn't exist any more.",
  started: "That booking has already started, so it can't be changed.",
};

// How many bookings a month cell lists before collapsing into "+N more".
const MONTH_CELL_LIMIT = 3;

type View = "week" | "month";

// What the calendar is showing. `anchor` is the Monday of the week in week
// view, or "YYYY-MM" in month view.
type CalendarState = { room: Room; view: View; anchor: string };

function calendarUrl(state: CalendarState, extra?: Record<string, string>) {
  const params = new URLSearchParams(
    state.view === "month"
      ? { room: state.room, view: "month", month: state.anchor }
      : { room: state.room, week: state.anchor },
  );
  for (const [key, value] of Object.entries(extra ?? {})) params.set(key, value);
  return `/booking?${params.toString()}`;
}

/** Where a booking on `day` is shown, in the view the member was using. */
function stateForDay(room: Room, view: View, day: string): CalendarState {
  return view === "month"
    ? { room, view, anchor: monthOf(day) }
    : { room, view, anchor: startOfWeek(day) };
}

// Where to send someone back to after an action, read from hidden fields.
// They're prefixed "return" so they can't be confused with the booking's own
// room field when editing.
function returnTo(formData: FormData): CalendarState {
  const room = parseRoom(formData.get("returnRoom")) ?? "STUDIO";
  const anchor = formData.get("returnAnchor");
  if (formData.get("returnView") === "month" && isMonthString(anchor)) {
    return { room, view: "month", anchor };
  }
  return {
    room,
    view: "week",
    anchor: isDayString(anchor) ? startOfWeek(anchor) : startOfWeek(today()),
  };
}

type BookingForm =
  | { ok: false; error: string; target: CalendarState }
  | {
      ok: true;
      room: Room;
      startsAt: Date;
      endsAt: Date;
      note: string | null;
      target: CalendarState;
    };

/** Validate the booking form, shared by booking and editing. */
function readBookingForm(formData: FormData, back: CalendarState): BookingForm {
  const room = parseRoom(formData.get("room"));
  const day = formData.get("day");
  const start = parseTime(formData.get("start"));
  const end = parseTime(formData.get("end"));
  if (!room || !isDayString(day) || start === undefined || end === undefined) {
    return { ok: false, error: "invalid", target: back };
  }
  // Show the result where the booking landed, even if that's another week.
  const target = stateForDay(room, back.view, day);
  if (end <= start) return { ok: false, error: "order", target };

  const startsAt = danishTimeToDate(day, start);
  const endsAt = danishTimeToDate(day, end);
  if (startsAt <= new Date()) return { ok: false, error: "past", target };

  const note =
    String(formData.get("note") ?? "")
      .trim()
      .slice(0, NOTE_MAX_LENGTH) || null;

  return { ok: true, room, startsAt, endsAt, note, target };
}

async function createBooking(formData: FormData) {
  "use server";
  const s = await auth();
  if (!s) redirect("/login?next=/booking");

  const back = returnTo(formData);
  const user = await membershipRepository.findUserById(s.user.id);
  if (!user) redirect("/login");
  if (!canBook(user)) redirect(calendarUrl(back, { error: "inactive" }));

  const form = readBookingForm(formData, back);
  if (!form.ok) redirect(calendarUrl(form.target, { error: form.error }));

  const result = await bookingRepository.create({
    userId: user.id,
    room: form.room,
    startsAt: form.startsAt,
    endsAt: form.endsAt,
    note: form.note,
    isDemo: user.isDemo,
  });

  redirect(
    calendarUrl(form.target, result.ok ? { booked: "1" } : { error: "taken" }),
  );
}

/**
 * Who may change or cancel a booking: its owner, or an admin within their own
 * scope (a demo admin can never touch a real member's booking).
 */
function mayManage(
  actor: { id: string; role: string; isDemo: boolean },
  booking: { userId: string; user: { isDemo: boolean } },
) {
  return (
    booking.userId === actor.id ||
    (actor.role === "ADMIN" && booking.user.isDemo === actor.isDemo)
  );
}

async function updateBooking(formData: FormData) {
  "use server";
  const s = await auth();
  if (!s) redirect("/login?next=/booking");

  const back = returnTo(formData);
  const bookingId = String(formData.get("bookingId"));
  const actor = await membershipRepository.findUserById(s.user.id);
  const booking = await bookingRepository.findById(bookingId);
  if (!actor || !booking) redirect(calendarUrl(back, { error: "gone" }));
  if (!mayManage(actor, booking)) {
    redirect(calendarUrl(back, { error: "not-allowed" }));
  }
  if (!canBook(actor)) redirect(calendarUrl(back, { error: "inactive" }));
  if (booking.startsAt <= new Date()) {
    redirect(calendarUrl(back, { error: "started" }));
  }

  // On a mistake, stay in edit mode so the member can fix it.
  const form = readBookingForm(formData, back);
  if (!form.ok) {
    redirect(calendarUrl(form.target, { error: form.error, edit: bookingId }));
  }

  const result = await bookingRepository.update(booking.id, {
    room: form.room,
    startsAt: form.startsAt,
    endsAt: form.endsAt,
    note: form.note,
    isDemo: booking.user.isDemo,
  });

  redirect(
    calendarUrl(
      form.target,
      result.ok ? { updated: "1" } : { error: "taken", edit: bookingId },
    ),
  );
}

async function cancelBooking(formData: FormData) {
  "use server";
  const s = await auth();
  if (!s) redirect("/login?next=/booking");

  const back = returnTo(formData);
  const actor = await membershipRepository.findUserById(s.user.id);
  const booking = await bookingRepository.findById(
    String(formData.get("bookingId")),
  );
  if (!actor || !booking) redirect(calendarUrl(back, { error: "gone" }));
  if (!mayManage(actor, booking)) {
    redirect(calendarUrl(back, { error: "not-allowed" }));
  }

  await bookingRepository.delete(booking.id);
  redirect(calendarUrl(back, { cancelled: "1" }));
}

/** Hidden fields that let an action send the member back to this view. */
function ReturnFields({ state }: { state: CalendarState }) {
  return (
    <>
      <input type="hidden" name="returnRoom" value={state.room} />
      <input type="hidden" name="returnView" value={state.view} />
      <input type="hidden" name="returnAnchor" value={state.anchor} />
    </>
  );
}

const linkClass =
  "text-violet-700 underline underline-offset-2 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300";

const cancelButtonClass =
  "text-xs text-gray-500 underline underline-offset-2 hover:text-red-700 dark:text-gray-400 dark:hover:text-red-400";

const editLinkClass =
  "text-xs text-gray-500 underline underline-offset-2 hover:text-violet-700 dark:text-gray-400 dark:hover:text-violet-300";

/** Edit and Cancel, for bookings the member may manage. */
function BookingActions({
  bookingId,
  state,
  canEdit,
}: {
  bookingId: string;
  state: CalendarState;
  canEdit: boolean;
}) {
  return (
    <span className="flex shrink-0 items-center gap-3">
      {canEdit && (
        <Link href={`${calendarUrl(state, { edit: bookingId })}#book`} className={editLinkClass}>
          Edit
        </Link>
      )}
      <form action={cancelBooking}>
        <input type="hidden" name="bookingId" value={bookingId} />
        <ReturnFields state={state} />
        <button type="submit" className={cancelButtonClass}>
          Cancel
        </button>
      </form>
    </span>
  );
}

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session) redirect("/login?next=/booking");

  const user = await membershipRepository.findUserById(session.user.id);
  if (!user) redirect("/login");
  if (needsOnboarding(user)) redirect(onboardingUrl("/booking"));

  const params = await searchParams;
  const todayKey = today();
  const room = parseRoom(params.room) ?? "STUDIO";
  const view: View = params.view === "month" ? "month" : "week";

  // Week view: Monday of the requested week. Month view: "YYYY-MM".
  const week = isDayString(params.week)
    ? startOfWeek(params.week)
    : startOfWeek(todayKey);
  const month = isMonthString(params.month) ? params.month : monthOf(todayKey);
  const state: CalendarState =
    view === "month"
      ? { room, view, anchor: month }
      : { room, view, anchor: week };

  // The days on screen, and the toggle targets for switching view. Going from
  // a week to a month shows the month that week starts in; going from a month
  // to a week shows this week if it's in that month, otherwise the first week.
  const days = view === "month" ? monthGridDays(month) : Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const weekTarget: CalendarState = {
    room,
    view: "week",
    anchor:
      view === "week"
        ? week
        : monthOf(todayKey) === month
          ? startOfWeek(todayKey)
          : startOfWeek(`${month}-01`),
  };
  const monthTarget: CalendarState = {
    room,
    view: "month",
    anchor: view === "month" ? month : monthOf(week),
  };

  const errorKey = typeof params.error === "string" ? params.error : undefined;
  const error = errorKey ? ERRORS[errorKey] : undefined;

  const bookable = canBook(user);
  // Demo visitors can book without paying; say so, so it isn't misleading.
  const demoBooking =
    user.isDemo && user.role !== "ADMIN" && !hasActiveMembership(user);
  const now = new Date();

  // The booking being edited, if any and if this member may edit it.
  const editParam = typeof params.edit === "string" ? params.edit : undefined;
  const editTarget = editParam
    ? await bookingRepository.findById(editParam)
    : null;
  const editing =
    bookable &&
    editTarget &&
    mayManage(user, editTarget) &&
    editTarget.startsAt > now
      ? editTarget
      : null;
  const [bookings, mine] = await Promise.all([
    bookingRepository.findInRange(
      room,
      danishTimeToDate(days[0], 0),
      danishTimeToDate(addDays(days[days.length - 1], 1), 0),
      user.isDemo,
    ),
    bookingRepository.findUpcomingForUser(user.id),
  ]);

  const byDay = new Map<string, typeof bookings>();
  for (const booking of bookings) {
    const key = dayKey(booking.startsAt);
    byDay.set(key, [...(byDay.get(key) ?? []), booking]);
  }

  // Pre-fill the form with today, or the first day being viewed if that's later.
  const firstShown = view === "month" ? `${month}-01` : week;
  const defaultDay = firstShown > todayKey ? firstShown : todayKey;
  const times = timeOptions();

  // Form values: the booking being edited, or sensible defaults for a new one.
  const editDay = editing ? dayKey(editing.startsAt) : null;
  const form = editing
    ? {
        room: editing.room as Room,
        day: editDay!,
        start: formatTime(editing.startsAt),
        end:
          dayKey(editing.endsAt) === editDay ? formatTime(editing.endsAt) : "24:00",
        note: editing.note ?? "",
      }
    : { room, day: defaultDay, start: "18:00", end: "21:00", note: "" };

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <Link
        href="/dashboard"
        className="text-sm text-gray-500 underline underline-offset-2 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
      >
        ← Your membership
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Book the studio or stage</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Signed in as {user.email}
      </p>

      {/* Room tabs */}
      <nav className="mt-8 flex gap-2" aria-label="Room">
        {ROOMS.map((r) => (
          <Link
            key={r.id}
            href={calendarUrl({ ...state, room: r.id })}
            scroll={false}
            aria-current={r.id === room ? "page" : undefined}
            className={
              r.id === room
                ? "rounded-full bg-violet-600 px-5 py-2 text-sm font-medium text-white"
                : "rounded-full border border-gray-300 px-5 py-2 text-sm font-medium transition hover:border-violet-600 dark:border-gray-700 dark:hover:border-violet-500"
            }
          >
            {r.label}
          </Link>
        ))}
      </nav>

      {error && (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}
      {params.booked === "1" && (
        <p className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300">
          You&apos;re booked. It&apos;s on the calendar below.
        </p>
      )}
      {params.updated === "1" && (
        <p className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300">
          Booking updated.
        </p>
      )}
      {params.cancelled === "1" && (
        <p className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300">
          Booking cancelled.
        </p>
      )}

      {/* New booking */}
      {bookable ? (
        <section
          id="book"
          className={`mt-6 scroll-mt-6 rounded-xl border p-5 ${
            editing
              ? "border-violet-300 bg-violet-50/50 dark:border-violet-500/40 dark:bg-violet-500/5"
              : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/40"
          }`}
        >
          <h2 className="font-semibold">
            {editing
              ? editing.userId === user.id
                ? "Edit your booking"
                : `Edit ${displayName(editing.user)}'s booking`
              : `Book the ${roomLabel(room).toLowerCase()}`}
          </h2>
          {demoBooking && !editing && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Demo: you can book without an active membership. Real members
              need one.
            </p>
          )}
          <form
            // Remount when switching between new and edit, so defaults apply.
            key={editing?.id ?? "new"}
            action={editing ? updateBooking : createBooking}
            className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]"
          >
            <ReturnFields state={state} />
            {editing ? (
              <>
                <input type="hidden" name="bookingId" value={editing.id} />
                <label className="flex flex-col gap-1 text-sm sm:col-span-3">
                  <span className="text-gray-600 dark:text-gray-400">Room</span>
                  <select
                    name="room"
                    defaultValue={form.room}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-violet-500 sm:w-48 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                  >
                    {ROOMS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <input type="hidden" name="room" value={room} />
            )}
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-600 dark:text-gray-400">Date</span>
              <input
                type="date"
                name="day"
                required
                min={todayKey}
                defaultValue={form.day}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:[color-scheme:dark]"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-600 dark:text-gray-400">From</span>
              <select
                name="start"
                defaultValue={form.start}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              >
                {times.slice(0, -1).map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-600 dark:text-gray-400">To</span>
              <select
                name="end"
                defaultValue={form.end}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              >
                {times.slice(1).map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-3">
              <span className="text-gray-600 dark:text-gray-400">
                What for? <span className="text-gray-400">(optional)</span>
              </span>
              <input
                type="text"
                name="note"
                maxLength={NOTE_MAX_LENGTH}
                defaultValue={form.note}
                placeholder="e.g. band rehearsal, recording vocals"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder-gray-500"
              />
            </label>
            <div className="flex items-center gap-4 sm:col-span-3">
              <button
                type="submit"
                className="rounded-full bg-violet-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500"
              >
                {editing ? "Save changes" : `Book ${roomLabel(room).toLowerCase()}`}
              </button>
              {editing && (
                <Link
                  href={calendarUrl(state)}
                  className="text-sm text-gray-500 underline underline-offset-2 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  Stop editing
                </Link>
              )}
            </div>
          </form>
        </section>
      ) : (
        <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
          <p>
            Booking is for active members. You can see the calendar, but to
            book time{" "}
            <Link
              href="/dashboard"
              className="font-medium underline underline-offset-2"
            >
              renew your membership
            </Link>{" "}
            first.
          </p>
        </section>
      )}

      {/* Heading, week/month toggle and navigation. These links use
          scroll={false} so switching view or week keeps the calendar where it
          is instead of jumping back to the top of the page. */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">
          {roomLabel(room)} ·{" "}
          {view === "month" ? formatMonth(month) : `week ${isoWeekNumber(week)}`}
        </h2>
        <div
          className="inline-flex rounded-full border border-gray-300 p-0.5 text-sm dark:border-gray-700"
          role="group"
          aria-label="Calendar view"
        >
          {(
            [
              ["week", "Week", weekTarget],
              ["month", "Month", monthTarget],
            ] as const
          ).map(([id, label, target]) => (
            <Link
              key={id}
              href={calendarUrl(target)}
              scroll={false}
              aria-current={view === id ? "page" : undefined}
              className={
                view === id
                  ? "rounded-full bg-gray-900 px-4 py-1 font-medium text-white dark:bg-gray-100 dark:text-gray-900"
                  : "rounded-full px-4 py-1 text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              }
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      <div className="mt-2 flex gap-4 text-sm">
        {view === "month" ? (
          <>
            <Link href={calendarUrl({ ...state, anchor: addMonths(month, -1) })} className={linkClass} scroll={false}>
              ← Previous
            </Link>
            {month !== monthOf(todayKey) && (
              <Link href={calendarUrl({ ...state, anchor: monthOf(todayKey) })} className={linkClass} scroll={false}>
                This month
              </Link>
            )}
            <Link href={calendarUrl({ ...state, anchor: addMonths(month, 1) })} className={linkClass} scroll={false}>
              Next →
            </Link>
          </>
        ) : (
          <>
            <Link href={calendarUrl({ ...state, anchor: addDays(week, -7) })} className={linkClass} scroll={false}>
              ← Previous
            </Link>
            {week !== startOfWeek(todayKey) && (
              <Link href={calendarUrl({ ...state, anchor: startOfWeek(todayKey) })} className={linkClass} scroll={false}>
                This week
              </Link>
            )}
            <Link href={calendarUrl({ ...state, anchor: addDays(week, 7) })} className={linkClass} scroll={false}>
              Next →
            </Link>
          </>
        )}
      </div>

      {view === "month" ? (
        /* Month overview: whole weeks, Monday first. Each day links to its
           week, where bookings can be cancelled. */
        <div className="mt-4">
          <div className="grid grid-cols-7 gap-px text-center text-xs font-medium text-gray-500 dark:text-gray-400">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="pb-2">
                {d}
              </div>
            ))}
          </div>
          <ol className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200 dark:border-gray-800 dark:bg-gray-800">
            {days.map((day) => {
              const dayBookings = byDay.get(day) ?? [];
              const inMonth = monthOf(day) === month;
              const isToday = day === todayKey;
              const isPast = day < todayKey;
              const shown = dayBookings.slice(0, MONTH_CELL_LIMIT);
              const hidden = dayBookings.length - shown.length;
              return (
                <li key={day} className="bg-white dark:bg-[#0a0a0c]">
                  <Link
                    href={calendarUrl({ room, view: "week", anchor: startOfWeek(day) })}
                    scroll={false}
                    aria-label={`${formatDay(day)}: ${
                      dayBookings.length === 0
                        ? "free all day"
                        : `${dayBookings.length} booking${dayBookings.length === 1 ? "" : "s"}`
                    }`}
                    className={`block h-full min-h-16 p-1.5 transition hover:bg-violet-50 sm:min-h-24 sm:p-2 dark:hover:bg-violet-500/10 ${
                      !inMonth ? "opacity-35" : isPast ? "opacity-55" : ""
                    }`}
                  >
                    <span
                      className={`inline-flex size-6 items-center justify-center rounded-full text-xs ${
                        isToday
                          ? "bg-violet-600 font-semibold text-white"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {Number(day.slice(8))}
                    </span>

                    {/* Phones: a dot per booking. Wider screens: time and name. */}
                    {dayBookings.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-0.5 sm:hidden" aria-hidden>
                        {dayBookings.slice(0, 4).map((b) => (
                          <span
                            key={b.id}
                            className={`size-1.5 rounded-full ${
                              b.userId === user.id ? "bg-violet-600" : "bg-gray-400 dark:bg-gray-500"
                            }`}
                          />
                        ))}
                      </span>
                    )}
                    <span className="mt-1 hidden space-y-0.5 sm:block" aria-hidden>
                      {shown.map((b) => (
                        <span
                          key={b.id}
                          className={`block truncate rounded px-1 text-[11px] leading-4 ${
                            b.userId === user.id
                              ? "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          <span className="tabular-nums">{formatTime(b.startsAt)}</span>{" "}
                          {b.userId === user.id ? "You" : displayName(b.user).split(" ")[0]}
                        </span>
                      ))}
                      {hidden > 0 && (
                        <span className="block px-1 text-[11px] text-gray-500 dark:text-gray-400">
                          +{hidden} more
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            All times are Danish time. Tap a day to see its week in detail.
          </p>
        </div>
      ) : (
        <>
          {/* The week, one row per day */}
          <ol className="mt-4 divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {days.map((day) => {
              const dayBookings = byDay.get(day) ?? [];
              const isPast = day < todayKey;
              return (
                <li
                  key={day}
                  className={`px-5 py-5 ${isPast ? "opacity-50" : ""} ${
                    day === todayKey ? "bg-violet-50/60 dark:bg-violet-500/5" : ""
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-medium">
                      {formatDay(day)}
                      {day === todayKey && (
                        <span className="ml-2 text-xs font-normal text-violet-700 dark:text-violet-400">
                          today
                        </span>
                      )}
                    </h3>
                    {dayBookings.length === 0 && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Free all day
                      </span>
                    )}
                  </div>

                  {/* 24-hour bar, so free gaps are visible at a glance */}
                  <div
                    className="relative mt-3 h-2 rounded-full bg-gray-100 dark:bg-gray-800"
                    aria-hidden
                  >
                    {dayBookings.map((b) => {
                      const dayStart = danishTimeToDate(day, 0).getTime();
                      const dayEnd = danishTimeToDate(day, 24 * 60).getTime();
                      const span = dayEnd - dayStart;
                      const left = ((b.startsAt.getTime() - dayStart) / span) * 100;
                      const width =
                        ((b.endsAt.getTime() - b.startsAt.getTime()) / span) * 100;
                      return (
                        <span
                          key={b.id}
                          className={`absolute inset-y-0 rounded-full ${
                            b.userId === user.id
                              ? "bg-violet-600"
                              : "bg-gray-400 dark:bg-gray-500"
                          }`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                        />
                      );
                    })}
                  </div>

                  {dayBookings.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {dayBookings.map((b) => {
                        const mineHere = b.userId === user.id;
                        const canCancel =
                          (mineHere || user.role === "ADMIN") && b.endsAt > now;
                        const canEdit = bookable && canCancel && b.startsAt > now;
                        return (
                          <li
                            key={b.id}
                            className={`flex items-center justify-between gap-3 text-sm ${
                              editing?.id === b.id
                                ? "-mx-2 rounded bg-violet-100 px-2 dark:bg-violet-500/15"
                                : ""
                            }`}
                          >
                            <span>
                              <span className="font-mono tabular-nums">
                                {formatTimeRange(b.startsAt, b.endsAt)}
                              </span>{" "}
                              <span
                                className={
                                  mineHere
                                    ? "font-medium text-violet-700 dark:text-violet-400"
                                    : ""
                                }
                              >
                                {mineHere ? "You" : displayName(b.user)}
                              </span>
                              {b.note && (
                                <span className="text-gray-500 dark:text-gray-400">
                                  {" "}
                                  · {b.note}
                                </span>
                              )}
                            </span>
                            {canCancel && (
                              <BookingActions
                                bookingId={b.id}
                                state={state}
                                canEdit={canEdit}
                              />
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            All times are Danish time.
          </p>
        </>
      )}

      {/* The member's own upcoming bookings, both rooms */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold">Your upcoming bookings</h2>
        {mine.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Nothing booked yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-200 dark:divide-gray-800">
            {mine.map((b) => {
              const bookingDay = dayKey(b.startsAt);
              return (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <Link
                    href={calendarUrl({ room: b.room, view: "week", anchor: startOfWeek(bookingDay) })}
                    className="hover:underline"
                  >
                    <span className="font-medium">{roomLabel(b.room)}</span>
                    {" · "}
                    {formatDay(bookingDay, "short")}
                    {" · "}
                    <span className="font-mono tabular-nums">
                      {formatTimeRange(b.startsAt, b.endsAt)}
                    </span>
                    {b.note && (
                      <span className="text-gray-500 dark:text-gray-400">
                        {" "}
                        · {b.note}
                      </span>
                    )}
                  </Link>
                  <BookingActions
                    bookingId={b.id}
                    state={state}
                    canEdit={bookable && b.startsAt > now}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
