import { redirect } from "next/navigation";

// The login page doubles as the front page: it explains what the app is and
// offers the demo. Sending signed-in visitors straight to their dashboard
// would skip that, which is the first thing most people need to see.
export default function Home() {
  redirect("/login");
}
