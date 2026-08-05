import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <h1 className="text-3xl font-bold">Sign in</h1>
      <p className="mt-3 text-gray-600 dark:text-gray-400">
        Enter your email and we&apos;ll send you a secure login link.
      </p>

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
    </main>
  );
}
