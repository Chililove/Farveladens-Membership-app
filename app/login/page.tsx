// =============================================================================
//  LOGIN PAGE  —  lives at "/login"
// =============================================================================
//  Passwordless sign-in: the member types their email, we email them a one-time
//  link, they click it, and they're logged in. The <form> uses a Server Action
//  (the inline async function with "use server") that calls Auth.js's signIn.
// =============================================================================

import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <h1 className="text-3xl font-bold">Sign in</h1>
      <p className="mt-3 text-gray-600">
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
          className="rounded-lg border border-gray-300 px-4 py-3"
        />
        <button
          type="submit"
          className="rounded-full bg-black px-6 py-3 font-medium text-white transition hover:bg-gray-800"
        >
          Send me a login link
        </button>
      </form>
    </main>
  );
}
