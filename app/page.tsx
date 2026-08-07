import { redirect } from "next/navigation";

// The app has no public landing page yet - send visitors straight to their
// dashboard. /dashboard redirects on to /login when nobody is signed in.
export default function Home() {
  redirect("/dashboard");
}
