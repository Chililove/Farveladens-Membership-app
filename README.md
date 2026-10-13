# Farveladen Membership

Membership and dues tracking for **Rytmisk Farvelade Forening**, a volunteer-run
music studio in Denmark.

**[Live demo →](https://farveladens-membership-app.vercel.app)** - no sign-up
needed, there are demo accounts on the login page.

---

## The problem

The forening has around 45 members who pay dues of 100 kr a month, 600 kr for
six months, or 1200 kr a year. Members transfer the money to the club account
themselves. There is no card payment or automatic collection.

Tracking who had paid meant a spreadsheet, a board member cross-referencing bank
statements, and a lot of chasing people who had quietly lapsed months ago. The
work fell on whoever had the energy for it, and it was easy to forget entirely
between meetings.

## What this does

- On first login a member gives the name other members will see and accepts
  the club rules.
- A member picks a plan and registers that they are going to transfer the money.
- The app shows them the amount and where to send it.
- A board member confirms the transfer arrived, which extends the membership.
- Everyone can see their own status: active, expiring soon, expired.
- The board gets an email every second week listing what needs attention.
- Active members can book the studio or the stage at `/booking`, see who has
  booked what in a week or month view, and cancel their own bookings. The forening's website links
  straight there; anyone not logged in is sent back after signing in.

## Design decisions

**No payment provider integration.** The obvious next step is MobilePay's
Recurring API, but the fees decide it: at ~285 transactions a year, MobilePay
costs about 820 kr annually versus roughly 1300 kr for Stripe, plus a one-off
setup fee. The board hasn't chosen yet, so the app deliberately stops at
recording and confirming manual transfers rather than guessing. The payment step
is isolated behind a repository so swapping it out later doesn't touch the UI.

**Confirming a payment is a transaction.** Marking a payment confirmed and
extending the member's expiry happen together in `prisma.$transaction`, so a
crash can't leave a member charged but not extended.

**Membership is invite-only.** Auth.js will happily create an account for any
address typed into a login form. A `signIn` callback rejects emails the board
hasn't already added, so the admin "Add a member" form is the real gate.

**Plans are resolved server-side.** The plan id travels in the form, but the
amount and duration are looked up on the server, so a tampered form can't buy a
year for the price of a month.

**Booking can't double-book.** Checking for a clash and inserting the booking
run in one serializable transaction, so two members grabbing the same evening
at the same moment can't both get it. Times are entered and shown in Danish
time and stored in UTC, so bookings stay put across the clock changes.

**Fortnightly, not weekly.** Cron has no fortnightly expression, so the job runs
every Monday and only sends on even ISO weeks. Vercel's Hobby plan caps cron at
once per day, which this stays well within.

**Demo mode is isolated.** Demo accounts are flagged in the database rather than
matched by email pattern, so anything a visitor creates is cleaned up on the
next demo login and never reaches the board's digest.

## Built with

Next.js (App Router, server actions) · TypeScript · Prisma · PostgreSQL ·
Auth.js with magic links · Tailwind · Resend · deployed on Vercel

## Running locally

```bash
git clone https://github.com/Chililove/Farveladens-Membership-app
cd Farveladens-Membership-app
npm install
cp .env.example .env      # then fill in the values
npx prisma migrate deploy
npm run db:seed-demo      # optional, creates demo data
npm run dev
```

`.env.example` documents every variable. You'll need a PostgreSQL database and
a [Resend](https://resend.com) API key for the login emails.

> Note: `npm run build` runs `prisma migrate deploy` first, so use
> `npx next build` if you only want to check that the app compiles.

## Status and known limits

- **Login emails only reach one address.** Resend's test mode delivers only to
  the account owner until a sending domain is verified, so real members can't
  receive magic links yet. This is why the demo accounts exist.
- **Expiry is informational.** Nothing is revoked when a membership lapses -
  studio access is controlled by a physical key, not this app.
- **Member reminders aren't built.** The board digest is; individual "your
  membership expires soon" emails are blocked on the same domain question.
- The club rules on `/rules` are placeholder text.
