import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";
import { DEMO_ENABLED } from "@/lib/demo";
import { safeNext } from "@/lib/onboarding";

const REPO_URL = "https://github.com/Chililove/Farveladens-Membership-app";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next: nextParam } = await searchParams;
  // Where to go after signing in. Lets the forening's website link straight to
  // /booking: the visitor logs in and lands back there.
  const next = safeNext(nextParam);
  const session = await auth();

  return (
    <main className="mx-auto max-w-xl px-6 py-20">
      {/* Someone arriving here with a session still gets the explanation and
          the demo, but with a way back to where they were. */}
      {session && (
        <div className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-gray-200 px-4 py-3 text-sm dark:border-gray-800">
          <span className="text-gray-600 dark:text-gray-400">
            Signed in as {session.user.email}
          </span>
          <Link
            href={next}
            className="text-violet-700 underline underline-offset-2 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300"
          >
            Continue
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-gray-500 underline underline-offset-2 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              Sign out
            </button>
          </form>
        </div>
      )}

      {/* What this is - most visitors arrive with no context. */}
      <section>
        <h1 className="text-3xl font-bold">Farveladen Membership</h1>
        <p className="mt-4 leading-relaxed text-gray-700 dark:text-gray-300">
          Rytmisk Farvelade Forening is a volunteer-run music studio. Members
          pay their dues by transferring the money to the club&apos;s account -
          there&apos;s no card payment or automatic collection yet, because the
          board hasn&apos;t decided which provider is worth the fees.
        </p>
        <p className="mt-4 leading-relaxed text-gray-700 dark:text-gray-300">
          Keeping track of who had paid meant a spreadsheet and a lot of
          chasing. This app replaces that. A member picks a plan and registers
          their transfer, someone on the board confirms it arrived, and everyone
          can see their own status. The board gets a summary by email every
          second week so nobody has to remember to check.
        </p>
      </section>

      {DEMO_ENABLED && (
        <section className="mt-10 rounded-xl border border-dashed border-gray-300 p-5 dark:border-gray-700">
          <h2 className="font-semibold">Try it - no sign-up needed</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Two demo accounts with sample data. Starting as a member resets
            everything, so click anything you like.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <form
              action={async () => {
                "use server";
                await signIn("demo", {
                  role: "MEMBER",
                  redirectTo: next,
                });
              }}
              className="flex-1"
            >
              <button
                type="submit"
                className="w-full rounded-full bg-violet-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-violet-500"
              >
                Try as member
              </button>
            </form>

            <form
              action={async () => {
                "use server";
                await signIn("demo", {
                  role: "ADMIN",
                  redirectTo: "/admin",
                });
              }}
              className="flex-1"
            >
              <button
                type="submit"
                className="w-full rounded-full border border-gray-900 px-5 py-3 text-sm font-medium transition hover:bg-gray-900 hover:text-white dark:border-gray-600 dark:hover:border-violet-500 dark:hover:bg-violet-500/10 dark:hover:text-violet-200"
              >
                Try as admin
              </button>
            </form>
          </div>

          <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
            To see the whole flow: register a payment as the member, then switch
            to admin and confirm it.
          </p>
        </section>
      )}

      {/* Real members sign in here. */}
      <section className="mt-12 border-t border-gray-200 pt-10 dark:border-gray-800">
        <h2 className="text-xl font-semibold">Members</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Enter your email and we&apos;ll send you a secure login link. Only
          addresses the board has added can sign in.
        </p>

        {error === "AccessDenied" && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            That email isn&apos;t a registered member. Ask the board to add you
            first.
          </p>
        )}

        <form
          action={async (formData: FormData) => {
            "use server";
            await signIn("resend", {
              email: String(formData.get("email")),
              redirectTo: next,
            });
          }}
          className="mt-5 flex flex-col gap-3 sm:flex-row"
        >
          <input
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-violet-500"
          />
          <button
            type="submit"
            className="rounded-full border border-gray-900 px-6 py-3 text-sm font-medium transition hover:bg-gray-900 hover:text-white dark:border-gray-600 dark:hover:border-violet-500 dark:hover:bg-violet-500/10 dark:hover:text-violet-200"
          >
            Send login link
          </button>
        </form>
      </section>

      <footer className="mt-14 text-sm text-gray-500 dark:text-gray-500">
        Next.js, Prisma and Postgres.{" "}
        <a
          href={REPO_URL}
          className="underline underline-offset-2 hover:text-gray-900 dark:hover:text-gray-200"
        >
          Source on GitHub →
        </a>
      </footer>
    </main>
  );
}
