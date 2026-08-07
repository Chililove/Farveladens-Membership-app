// Admin-only: confirm pending payments and view the member roster.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { membershipRepository } from "@/lib/repositories/membershipRepository";
import { getMembershipStatus } from "@/lib/membership";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null) {
  return date
    ? new Intl.DateTimeFormat("da-DK", { dateStyle: "medium" }).format(date)
    : "—";
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  EXPIRING_SOON: "Expiring soon",
  EXPIRED: "Expired",
  NONE: "Never paid",
};

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: "text-green-700 dark:text-green-400",
  EXPIRING_SOON: "text-amber-700 dark:text-amber-400",
  EXPIRED: "text-red-700 dark:text-red-400",
  NONE: "text-gray-500 dark:text-gray-400",
};

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login");
  // Members can't see this page.
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const pending = await membershipRepository.findPendingPayments();
  const members = await membershipRepository.findAllMembers();

  async function confirmPayment(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s || s.user.role !== "ADMIN") return; // re-check on the server
    await membershipRepository.confirmPayment(String(formData.get("paymentId")));
    revalidatePath("/admin");
  }

  async function addMember(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s || s.user.role !== "ADMIN") return;
    const email = String(formData.get("email")).trim().toLowerCase();
    if (!email) return;
    // Skip if a member with this email already exists.
    const existing = await membershipRepository.findUserByEmail(email);
    if (!existing) {
      // A demo visitor's additions are flagged so the next demo reset removes
      // them, rather than leaving invented names in the real roster.
      const actor = await membershipRepository.findUserById(s.user.id);
      await membershipRepository.createMember(email, actor?.isDemo ?? false);
    }
    revalidatePath("/admin");
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold">Admin</h1>

      {/* Add a new member by email */}
      <section className="mt-8 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/40">
        <h2 className="font-semibold">Add a member</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Enter their email. They log in with that email via a magic link.
        </p>
        <form action={addMember} className="mt-3 flex gap-2">
          <input
            name="email"
            type="email"
            required
            placeholder="member@example.com"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-violet-500"
          />
          <button
            type="submit"
            className="rounded-full bg-violet-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
          >
            Add
          </button>
        </form>
      </section>

      {/* Pending payments awaiting confirmation */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold">
          Payments to confirm ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Nothing waiting. 🎉
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-200 dark:divide-gray-800">
            {pending.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between py-4"
              >
                <div>
                  <p className="font-medium">{p.user.email}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {p.amountDkk} kr · would extend to {formatDate(p.periodEnd)}
                  </p>
                </div>
                <form action={confirmPayment}>
                  <input type="hidden" name="paymentId" value={p.id} />
                  <button
                    type="submit"
                    className="rounded-full bg-green-700 px-5 py-2 text-sm font-medium text-white transition hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-500"
                  >
                    Confirm
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Full member roster */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold">Members ({members.length})</h2>
        <table className="mt-4 w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <tr>
              <th className="py-2">Email</th>
              <th className="py-2">Status</th>
              <th className="py-2">Expires</th>
              <th className="py-2">Rules</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const status = getMembershipStatus(m.membershipExpiresAt);
              return (
                <tr
                  key={m.id}
                  className="border-b border-gray-100 dark:border-gray-800/60"
                >
                  <td className="py-2">{m.email}</td>
                  <td className={`py-2 ${STATUS_CLASS[status]}`}>
                    {STATUS_LABEL[status]}
                  </td>
                  <td className="py-2">{formatDate(m.membershipExpiresAt)}</td>
                  <td className="py-2">{m.rulesAcceptedAt ? "✅" : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}
