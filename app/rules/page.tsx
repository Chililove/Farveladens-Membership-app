// Members must accept the rules here before they can reach their dashboard.

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { membershipRepository } from "@/lib/repositories/membershipRepository";

export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await membershipRepository.findUserWithPayments(session.user.id);
  // Already accepted? No need to see this again.
  if (user?.rulesAcceptedAt) redirect("/dashboard");

  async function accept() {
    "use server";
    const s = await auth();
    if (!s) return;
    await membershipRepository.acceptRules(s.user.id);
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold">Our rules</h1>
      <p className="mt-2 text-sm text-gray-500">
        Please read and accept to continue.
      </p>

      {/* TODO: replace this placeholder with Farveladen's real rules. */}
      <div className="mt-6 space-y-4 rounded-xl border border-gray-200 p-6 text-gray-700">
        <p>
          Welcome to Farveladen. By becoming a member you agree to treat the
          studio, the equipment, and each other with respect.
        </p>
        <p>
          Clean up after yourself, book the room before you use it, and never
          lend your access to non-members.
        </p>
        <p>
          Membership dues keep the lights on and the rent paid. Be kind, make
          music, build something together. 🎶
        </p>
      </div>

      <form action={accept} className="mt-8">
        <button
          type="submit"
          className="rounded-full bg-black px-8 py-3 font-medium text-white transition hover:bg-gray-800"
        >
          I have read and accept the rules
        </button>
      </form>
    </main>
  );
}
