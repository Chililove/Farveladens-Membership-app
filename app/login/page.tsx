import { signIn } from "@/auth";
import { DEMO_ENABLED } from "@/lib/demo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <h1 className="text-3xl font-bold">Sign in</h1>
      <p className="mt-3 text-gray-600 dark:text-gray-400">
        Enter your email and we&apos;ll send you a secure login link.
      </p>

      {error === "AccessDenied" && (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          That email isn&apos;t a registered member. Ask the board to add you
          first.
        </p>
      )}

      <form
        action={async (formData: FormData) => {
          "use server";
          await signIn("resend", {
            email: String(formData.get("email")),
            redirectTo: "/dashboard",
          });
        }}
        className="mt-8 flex flex-col gap-4"
      >
        <input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-violet-500"
        />
        <button
          type="submit"
          className="rounded-full bg-violet-600 px-6 py-3 font-medium text-white transition hover:bg-violet-500"
        >
          Send me a login link
        </button>
      </form>

      {DEMO_ENABLED && (
        <section className="mt-12 rounded-xl border border-dashed border-gray-300 p-5 dark:border-gray-700">
          <h2 className="font-semibold">Just looking around?</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Try the app without signing up. The demo data resets every time, so
            feel free to click anything.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <form
              action={async () => {
                "use server";
                await signIn("demo", {
                  role: "MEMBER",
                  redirectTo: "/dashboard",
                });
              }}
              className="flex-1"
            >
              <button
                type="submit"
                className="w-full rounded-full border border-gray-900 px-5 py-3 text-sm font-medium transition hover:bg-gray-900 hover:text-white dark:border-gray-600 dark:hover:border-violet-500 dark:hover:bg-violet-500/10 dark:hover:text-violet-200"
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
        </section>
      )}
    </main>
  );
}
