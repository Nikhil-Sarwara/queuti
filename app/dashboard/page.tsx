import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession } from "@/lib/auth";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

/** Placeholder protected page — the Kanban tracker (task #5) lands here. */
export default async function DashboardPage() {
  const token = cookies().get("queuti_token")?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect("/login");

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Card>
        <h1 className="text-xl font-bold">🗂️ Dashboard</h1>
        <p className="mt-2 text-sm opacity-80">
          Signed in as <strong>{session.email}</strong>.
        </p>
        <p className="mt-4 text-sm opacity-70">
          The Kanban application tracker lands here (task #5). Protected route
          works — middleware + JWT verified.
        </p>
        <form action="/api/auth/logout" method="post" className="mt-6">
          <button
            type="submit"
            className="rounded border-2 border-b-4 border-red-300 bg-red-100 px-4 py-2 text-sm font-semibold text-red-800 active:border-b-2"
          >
            Log out
          </button>
        </form>
      </Card>
      <p className="mt-6 text-center text-xs opacity-50">
        <Link href="/">← Back to home</Link>
      </p>
    </main>
  );
}