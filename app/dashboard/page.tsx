// =============================================================================
//  DASHBOARD  —  lives at "/dashboard" (members only)
// =============================================================================
//  A protected page. We read the session with auth(); if there's none, we send
//  the visitor to /login. For now it just proves login works by showing who
//  you are. In the next phase this becomes the real membership dashboard.
// =============================================================================

import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();

  // Not logged in? Bounce to the login page.
  if (!session) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-3xl font-bold">Welcome 👋</h1>
      <p className="mt-3 text-gray-600">
        You&apos;re signed in as <strong>{session.user.email}</strong>.
      </p>
      <p className="mt-1 text-sm text-gray-500">Role: {session.user.role}</p>

      {/* Sign out via a Server Action */}
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
        className="mt-8"
      >
        <button
          type="submit"
          className="rounded-full border border-gray-300 px-6 py-3 font-medium transition hover:bg-gray-100"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
