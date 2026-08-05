import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/auth";
import { membershipRepository } from "@/lib/repositories/membershipRepository";
import {
  getMembershipStatus,
  nextPeriodEnd,
  getPlan,
  MEMBERSHIP_PLANS,
  MOBILEPAY_NUMBER,
} from "@/lib/membership";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("da-DK", { dateStyle: "long" }).format(date);
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await membershipRepository.findUserWithPayments(session.user.id);
  if (!user) redirect("/login");

  // Must accept the rules before using the dashboard.
  if (!user.rulesAcceptedAt) redirect("/rules");

  const status = getMembershipStatus(user.membershipExpiresAt);
  const pending = user.payments.find((p) => p.status === "PENDING");

  async function registerPayment(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s) return;

    const plan = getPlan(String(formData.get("planId")));
    if (!plan) return; // ignore unknown/tampered plan ids

    // Only one pending payment allowed at a time.
    const existing = await membershipRepository.findPendingPayment(s.user.id);
    if (existing) return;

    await membershipRepository.createPendingPayment({
      userId: s.user.id,
      amountDkk: plan.amountDkk,
      periodEnd: nextPeriodEnd(s.user.membershipExpiresAt, plan.months),
      method: "MOBILEPAY",
    });
    revalidatePath("/dashboard");
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-3xl font-bold">Your membership</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Signed in as {user.email}
      </p>

      {user.role === "ADMIN" && (
        <Link
          href="/admin"
          className="mt-2 inline-block text-sm text-violet-700 underline underline-offset-2 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300"
        >
          Go to admin →
        </Link>
      )}

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/40">
        {status === "ACTIVE" && (
          <p className="text-green-700 dark:text-green-400">
            ✅ Active — valid until{" "}
            <strong>{formatDate(user.membershipExpiresAt!)}</strong>
          </p>
        )}
        {status === "EXPIRING_SOON" && (
          <p className="text-amber-700 dark:text-amber-400">
            ⚠️ Expiring soon — valid until{" "}
            <strong>{formatDate(user.membershipExpiresAt!)}</strong>
          </p>
        )}
        {status === "EXPIRED" && (
          <p className="text-red-700 dark:text-red-400">
            ⛔ Expired{" "}
            {user.membershipExpiresAt
              ? `on ${formatDate(user.membershipExpiresAt)}`
              : ""}
          </p>
        )}
        {status === "NONE" && (
          <p className="text-gray-700 dark:text-gray-300">
            You&apos;re not a paying member yet.
          </p>
        )}
      </div>

      {pending ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/30 dark:bg-amber-500/10">
          <h2 className="font-semibold">Payment registered — please transfer</h2>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Send <strong>{pending.amountDkk} kr</strong> via MobilePay to{" "}
            <strong>{MOBILEPAY_NUMBER}</strong>, with your email as the message.
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Once we confirm the transfer, your membership will be extended to{" "}
            {formatDate(pending.periodEnd)}. (Awaiting confirmation.)
          </p>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/40">
          <h2 className="font-semibold">
            {status === "NONE" ? "Choose a plan to join" : "Renew — choose a plan"}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Pick a plan, then transfer the amount via MobilePay. An admin
            confirms it and your membership is extended.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {MEMBERSHIP_PLANS.map((plan) => (
              <form key={plan.id} action={registerPayment}>
                <input type="hidden" name="planId" value={plan.id} />
                <button
                  type="submit"
                  className="w-full rounded-xl border border-gray-300 p-4 text-left transition hover:border-violet-600 hover:bg-violet-50 dark:border-gray-700 dark:hover:border-violet-500 dark:hover:bg-violet-500/10"
                >
                  <span className="block text-lg font-semibold">
                    {plan.amountDkk} kr
                  </span>
                  <span className="block text-sm text-gray-500 dark:text-gray-400">
                    {plan.label}
                  </span>
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
        className="mt-10"
      >
        <button
          type="submit"
          className="text-sm text-gray-500 underline underline-offset-2 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
